
tileTypes
.run(['tileState', 'gettext', function (tileState, gettext) {
    tileState.addTemplate({
        deprecated: false,
        type: "collection",
        size: "",
        colour: "blue",
        icon: "list-alt",
        name: gettext("Collection"),
        description: gettext("A listing of one or more external content items"),
        image_url: path_root + 'assets/resources/tile-embed.png',
        template: {
            type: "collection",
            name: gettext("New Collection"),
            size: "normal",
            colour: "blue",
            icon: "list-alt",
            position: 0,
            settings: {
                member_size: 'normal',
                collection_name: '',
                allow_upload: false,
                download_content: true,
                force_title: false
            }
        }
    }
    );
}])
.controller('collectionTileController', ['tileState', 'callApi', 'sfsService', 'sharedTexts',
    '$scope', '$rootScope',
    function (tileState, callApi, sfsService, sharedTexts, $scope, $rootScope) {
        //make sure the inserted tile is not a template
        if (!$scope.tilereadonly && callApi.state.tiles[$scope.tileindex].template) {
            callApi.state.tiles[$scope.tileindex] = callApi.state.tiles[$scope.tileindex].template;
            $scope.tile = callApi.state.tiles[$scope.tileindex];
        }
        var _this = this;
        //The stack at this point is not even loaded. So we just initialise the values to a reasonable initial
        //value

        this.collection_name = $scope.tile.settings ? $scope.tile.settings.collection_name : '';
        this.labels = sfsService.labels;
        this.references = sfsService.selectRefs(this.collection_name);
        this.reference_count = this.references ? this.references.length : 0;
        this.tile = tileState.selectedTile;


        $rootScope.$on('LTBApp.stack: close active tile', function () {
            if ($scope.tile.tile_id === tileState.tileEdit_id) {
                tileState.tileEdit();
            }
        });

        if (callApi.state.tiles[$scope.tileindex] && !callApi.state.tiles[$scope.tileindex].template) {
            $rootScope.$on('sfsService:collection_name_change', function () {
                _this.collection_name = $scope.tile.settings ? $scope.tile.settings.collection_name : '';
            });

            $rootScope.$on('sfsService:update', function (e, data) {
                console.log('sfsService:update', $scope.tileindex, tileState.tileindex, $scope.tile);
                if (data.stack_code === callApi.state.stackid && 
                        !$scope.tile.template){
                    _this.labels = data.labels;
                    _this.references = sfsService.selectRefs(_this.collection_name, $scope.tile.settings.collection_name);
                    _this.reference_count = _this.references.length;

                    //only update background image for current tile
                    if ($scope.tileindex === tileState.tileindex && 
                        _this.reference_count === 1 && !callApi.state.tiles[$scope.tileindex].image_url) {
                        if (_this.references[0].details && _this.references[0].details.image_url) {
                            callApi.state.tiles[$scope.tileindex].image_url = _this.references[0].details.image_url;
                        }
                    }
                    
                }
            });
        }

        this.getNameSingletonCollection = function () {
            if ($scope.tile.template ||                     // for templates
                    $scope.tile.settings.allow_upload ||    // when upload is allowed
                    !$scope.tile.settings.force_title ||    // when ref title is not forced
                    this.references.length !== 1            // when there are more than 1 refs
                    ) {
                return $scope.tile.name;
            } else if (this.references[0].name) {
                return this.references[0].name;
            } else {
                return this.references[0].ref_type === 'link' ?
                        sharedTexts.getString('[Untitled] on')+ ' ' + this.references[0].details.provider_name :
                        this.references[0].file_name;
            }

        };

        this.tileEdit = function ($event) {
            tileState.tileEdit($event, $scope.tile, $scope.tileindex);
        };

        this.tileClick = function ($event) {
            if (!$scope.tiletemplate) {
                if ($scope.tilereadonly && !is_app) {
                    tileState.alerts.add(tileState.translateStandard('view_in_edit_modus'), 'warning');
                    return true;
                }
                
                if (this.references.length === 1 && 
                        !$scope.tile.settings.allow_upload && 
                        this.references[0].details.direct) {
                    
                    sfsService.openExternal(this.references[0].url)
                    return true;
                }
                
                //If there are items to view or if the user can add one in that screen
                //show it
                if ($scope.tile.settings.allow_upload || (this.reference_count > 0)) {
                    $(window).scrollTop(0);
                    tileState.toggleSelect($event, 'off');
                    tileState.setTile($scope.tile, "full", $scope.tileindex);
                } else {
                    tileState.alerts.add(
                            tileState.gettextCatalog.getString('There are no items to view'), 'warning');
                }
            }
        };
    
        this.openExternal = function(url, block){
            sfsService.openExternal(url, block);
        };
        
        this.tileAutoContent = function(tile){
            return sfsService.tileAutoContent(tile);
        };
        
        this.tileTemplateUrl = function () {
            return tileState.getTileUrl('collection');
        };

        this.fileIcon = function (ref) {
            return sfsService.fileIcon(ref);
        };

        this.showFirstProviderFavicon = function () {
            return this.references.length && this.references[0].ref_type === 'link' && this.references[0].details.favicon_url;
        };

        this.getFirstProviderFavicon = function () {
            return this.references.length && this.references[0].details && this.references[0].details.favicon_url ?
                    this.references[0].details.favicon_url : "";
        };
    }])

.controller('collectionFullController',
        ['AccessToken', 'tileState', 'callApi', 'sfsService', 'alerts', '$scope',
            'deviceDetector', '$rootScope', '$filter', '$window', 'useraccount',
    function (AccessToken, tileState, callApi, sfsService, alerts, $scope,
            deviceDetector, $rootScope, $filter, $window, useraccount) {

        sfsService.init();
        //While we are waiting for an update of the sfs service, we might already have the lists available

        this.tile = tileState.selectedTile;
        this.references = sfsService.selectRefs(this.tile.settings.collection_name);
        this.reference_count = this.references.length;
        this.os = deviceDetector.os;
        this.edit_stack = tileState.edit_stack;
        this.add_reference = false;
        this.reference_count = this.references.length;
        this.contentTitle = "";
        this.contentDescription = "";
        this.is_loading = false;
        
        this.is_video = true; //TODO Is unused at the moment in collection tile
        this.hammered = false; //initialisation. Should the play function of a tile be activated? == is_hammered= false
        this.use_hammer = this.tile.settings.allow_upload;
        this.nr_selected = 0;
        this.size_multiplier_icons = 4;
        
        var _this = this;

        this.init = function () {
            this.loading = callApi.loading_queue;
            this.is_loading = false;//this is the uploading var
            if (this.references.length === 1 && !this.tile.settings.allow_upload) {
                tileState.subscreen = 1;
                tileState.forceTileClose = true;
                this.play(this.references[0], true);
            } else {
                tileState.subscreen = 0;
                tileState.forceTileClose = false;
            }
        };
        $rootScope.$on('tilestate:setTileOnReload', function (){
            _this.reference_code = _this.entity.reference_code;
            sfsService.init();
        });

        $rootScope.$on('tilestate:setTile', function () {
            _this.init();
        });

        $rootScope.$on('sfsService:update', function (e, data) {
            deblog('sfsService:update', data, data.stack_code, callApi.state, callApi.state.tiles[$scope.tileindex],
                    callApi.state.stackid, data.stack_code === callApi.state.stackid, 'dus' + _this.collection_name + 'dus');
									
            if (data.stack_code === callApi.state.stackid) {
                if (data.collection) {

                    if (_this.tile.settings.collection_name == data.collection) {
                        _this.references = data.references;
                        _this.reference_count = data.reference_count;
                    }
                } else {
                    _this.labels = data.labels;
                    _this.references = sfsService.selectRefs(_this.tile.settings.collection_name);
                    _this.reference_count = _this.references.length;
                }
                
                //If we were looking at a specific reference we refresh that with the new loaded data
                if (_this.reference_code) {
                    var index_reference = -1;
                    for (var i=0; i<_this.references.length; i++) {
                        if (_this.references[i].reference_code === _this.reference_code) {
                            index_reference = i;
                        }
                    }
                    if (index_reference === -1) {
                        tileState.subscreen = 0;
                    } else {
                        _this.entity = _this.references[index_reference];
                    }
                }

            } else {
                //Appearantly for other stack 
            }
        });

        //Make sure the user has entered an absolute address. If it started with http(s) 
        //keep the address (and protocol) otherwise assume it is http://...
        var absUrl = function (link) {
            if (link.indexOf('http') === 0) {
                return link;
            } else {
                return 'http://' + link;
            }
        };
        
        this.deleteReferences = function(){
            if (!this.nr_selected){ 
                alerts.add('There are no items selected', 'warning');
            } else {
                var to_delete = $filter('filter')(this.references, {selected: true});
                deblog('found the following refs to delete',to_delete);
                sfsService.deleteMultipleRef(to_delete, function(result){
                    if (true){//result.a){
                        console.log('got back from deleteResources', result);
                        _this.nr_selected = 0;
                    }
                });
                //callApi.deleteRefs of misschien sfsService.deleteRefs(to_delete);
            }
        };

        this.addReference = function () {
            if (AccessToken.get()){
                $window.scrollTo(0, 0);
                //TODO: this seems nonsens to me: if not to deliberate loose time or so?
                //why not:
                /*
                 * tileState.subscreen = 1;
                    this.add_reference = true;
                 */
                if (in_app) {
                    tileState.subscreen = 1;
                    this.add_reference = true;
                } else {
                    tileState.subscreen = 1;
                    this.add_reference = true;
                }
                tileState.subscreen = 1;
                this.add_reference = true;
            } else {
                alerts.login(true);
            }
        };

        this.subscreen = function () {
            return tileState.subscreen;
        };

        this.tileClose = function ($event) {
            if (tileState.subscreen === 0) {
                tileState.setTile();
            } else if ((tileState.subscreen === 1) &&
                    ((this.reference_count === 1) && !tileState.selectedTile.settings.allow_upload)) {
                tileState.setTile();
            } else if (this.reference_count === 1) {
                this.add_reference = false;
                tileState.subscreen = tileState.subscreen - 1;
            } else {
                tileState.subscreen = tileState.subscreen - 1;
            }
        };
        
        this.play = function (entity, nosub) {
            if (this.hammered && this.use_hammer){
                //The hammer or pincer function has been called. Just switch the 
                //hammered property off to enable new clicks
                deblog('er is gehamerd en nu zetten we dat weer uit');
                this.hammered = false;
            } else {
                if (entity.details && entity.details.direct) {
                    sfsService.openExternal(entity.url);
                } else {
                    deblog('in FullCtrl.play. Is it hammered', this.hammered, this.use_hammer);

                    $window.scrollTo(0, 0);
                    this.add_reference = false;

                    this.entity = entity;

                    if (!nosub) {
                        tileState.subscreen = 1;
                    }
                }
            }
        };
        
        this.onHammer = function(event){
            console.log('hier eerst ff met gewone console');
            deblog('komt eerst in onHammer gaan we het ook gebruiken?', _this.use_hammer);
            //use hammer is about whether we want to select collection items by pressing them for a longer
            //time. After we can for example delete them
            if (!_this.use_hammer) return true;
            
            _this.hammered = true;
            deblog('komt eerst in onHammer', _this.hammered);
            var targetscope = angular.element(event.target).scope();
            var entity = targetscope.entity;
            console.log('In onHammer ', entity);
            if (!entity.selected) {
                if (entity['user.user_code'] !== useraccount.get('code')){
                    deblog('Ik denk dat ie niet de goede gegevens heeft', useraccount.get('code'),
                        entity);
                    alerts.add('You are not the owner of this item', 'warning');
                    _this.hammered = false;
                    return true;
                }
                entity.selected = true;
                _this.nr_selected += 1;
                if (_this.nr_selected === 1){
                    alerts.add('You can further select collection items that are yours and remove them with the remove tile below.');
                }
            } else deblog(' hij was al geselecteerd');
            
            deblog('ja hoera het aantal selected',_this.nr_selected);
        };
        
        this.onPincer = function(entity){
            deblog('in de onpincer entity en de referencies (superset dus)', entity,
                _this.references);
            if (!_this.use_hammer) return true;
            entity.selected = false;
            _this.nr_selected -= 1;
            _this.hammered = true;
            deblog('ja hoera het aantal selected is na pincer function',_this.nr_selected,
                _this.references);
        };
        
        this.allowUpload = function (upload_type) {
            if (this.tile.settings.allow_upload) {
                var types = $filter('filter')(sfsService.user_input_types, {active: true});
                //If this tile has specific file types allowed for upload, check those
                //otherwise return whether there is more than zero user input tyoes
                if (!this.tile.settings.allow_upload_type) {
                    return types.length;
                } else {
                    if (upload_type) {
                        if (this.tile.settings.allow_upload_type[upload_type]) {
                            return 1;
                        } else {
                            return 0;
                        }
                    } else {
                        var count = 0;
                        for (var i = 0; i < types.length; i++) {
                            if (this.tile.settings.allow_upload_type[types[i].key]) {
                                count++;
                            }
                        }
                        return count;
                    }
                }
            }
            return 0;
        };

        this.uploadTypes = function (check_type) {
            var result = [];
            if (this.tile.settings.allow_upload) {
                var types = $filter('filter')(sfsService.user_input_types, {active: true});
                for (var i = 0; i < types.length; i++) {


                    if (!this.tile.settings.allow_upload_type ||
                            this.tile.settings.allow_upload_type[types[i].key]) {

                        result = result.concat(types[i].types);
                    }
                }
                if (check_type) {
                    //loop over  result 
                    for (var j = 0; j < result.length; j++) {
                        var parts = result[j].split('/');
                        var main_type = parts.shift();
                        var sub_type = (parts) ? parts.shift() : '';
                        if (sfsService.is_type(check_type, main_type, sub_type)) {
                            return [result[j]];
                        }
                    }
                    return [];
                }
            }
            deblog('uploadTypes', result);
            return result;
        };

        //Upload File Code
        this.fileURL = "";
        this.fileCapture = false;
        this.tempResource = false;
        this.fileProgress = false;

        this.createResource = function () {
            var mimetype = (_this.fileCapture) ? _this.fileCapture.type : "image/png";
            _this.tempResource = {
                ref_type: "file",
                file_type: mimetype,
                url: _this.fileURL,
                details: {
                    image_url: _this.fileURL
                }
            };
        };

        //Plugin called ¿?
        this.gallerySuccess = function (imageURI) {
            deblog('Image: ' + imageURI);
            var imageURL = 'file://' + imageURI.replace("file://","");
            _this.fileURL = imageURL; 

            window.resolveLocalFileSystemURL(
                    imageURL,
                    function (fileEntry) {
                        _this.galleryFile(fileEntry);
                    },
                    function (error) {
                        deblog('resolveLocalFileSystemURL', error);
                        _this.galleryFail(error.code);
                    }
            );

        };

        this.galleryFile = function (fileEntry) {

            fileEntry.file(function (file) {

                //todo: check filtype using this.uploadTypes()
                //var allowed_types = _this.uploadTypes();
                if (_this.uploadTypes(file.type).length > 0) {
                    _this.fileCapture = file;
                    _this.createResource();

                    _this.contentTitle = "";
                    _this.contentDescription = "";
                    tileState.subscreen = 2;
                    $scope.$apply();
                } else {
                    _this.galleryFail(tileState.gettextCatalog.getString("This type of file is not allowed."));
                }
            });
        };

        this.galleryFail = function (message) {
            console.log('Loaded failed: ', message);
            tileState.alerts.add(tileState.gettextCatalog.getString('Error') + ': ' + message, 'danger');
            tileState.subscreen = 1;
            $scope.$apply();
        };

        this.openGallery = function () {
            if (in_app) {
                navigator.camera.getPicture(_this.gallerySuccess, _this.galleryFail, {
                    sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                    destinationType: Camera.DestinationType.FILE_URI,
                    mediaType: Camera.MediaType.ALLMEDIA}
                );
            } else {
                tileState.alerts.add(tileState.gettextCatalog.getString('This will only open on your mobile device'), 'warning');
            }

        };

        //Plugin called ¿?
        this.captureSuccess = function (mediaFiles) {
            var i, len;
            for (i = 0, len = mediaFiles.length; i < len; i += 1) {
                _this.fileURL = mediaFiles[i].fullPath;
                _this.fileCapture = mediaFiles[i];
            }
            _this.createResource();

            deblog("File Url = " + _this.fileCapture.fullPath);
            _this.contentTitle = "";
            _this.contentDescription = "";

            tileState.subscreen = 2;
            $scope.$apply();
        };

        // capture error callback
        this.captureError = function (error) {
//        navigator.notification.alert('Error code: ' + error.code, null, 'Capture Error');
            console.log("Capture was canceled");
            $scope.$apply();
        };

        this.takePhoto = function () {
            if (in_app) {
                navigator.device.capture.captureImage(_this.captureSuccess, _this.captureError, {limit: 1});
            } else {
                tileState.alerts.add(tileState.gettextCatalog.getString('This will only open on your mobile device'), 'warning');
            }
        };

        this.recordVideo = function () {
            if (in_app) {
                navigator.device.capture.captureVideo(_this.captureSuccess, _this.captureError, {limit: 1});
            } else {
                tileState.alerts.add(tileState.gettextCatalog.getString('This will only open on your mobile device'), 'warning');
            }

        };

        this.recordNote = function () {
            if (in_app) {
                navigator.device.capture.captureAudio(_this.captureSuccess, _this.captureError, {limit: 1});
            } else {
                tileState.alerts.add(tileState.gettextCatalog.getString('This will only open on your mobile device'), 'warning');
            }

        };

        this.recordText = function () {
            if (in_app) {
                this.contentTitle = "";
                this.contentDescription = "";
                this.fileCapture = {
                    fileName: 'message.html',
                    type: 'text/html',
                    richtext: true
                };
                tileState.subscreen = 2;
            } else {
                tileState.alerts.add(tileState.gettextCatalog.getString('This will only open on your mobile device'), 'warning');
            }
            
        };

        this.uploadHtml = function () {
            var b64str = window.btoa(this.contentDescription);
            this.fileURL = "data:text/html;base64," + b64str;
            this.contentDescription = "";
            this.uploadFile();
        };

        this.cancelUploadFile = function () {
            _this.fileURL = "";
            _this.fileCapture = false;
            _this.fileProgress = false;
            _this.tempResource = false;
            _this.contentTitle = "";
            _this.contentDescription = "";
            tileState.subscreen = 1;
        };

        this.uploadSuccess = function (r) {
            deblog("Code = " + r.responseCode);
            deblog("Response = " + r.response);
            deblog("Sent = " + r.bytesSent);

            _this.is_loading = false;
            _this.fileURL = "";
            _this.fileCapture = false;
            _this.fileProgress = false;
            _this.contentTitle = "";
            _this.contentDescription = "";

            tileState.subscreen = 0;
            _this.add_reference = false;
            tileState.alerts.add(tileState.gettextCatalog.getString('Upload succeeded'), 'success'); //Translate
            callApi.reloadStack();
        };

        this.uploadFail = function (error) {
            console.log("uploadFail: upload error", error);

            _this.is_loading = false;
            tileState.alerts.add(tileState.gettextCatalog.getString('File upload aborted'), 'danger'); //Translate
            $scope.$apply();
        };

        this.ft = false;
        this.uploadFile = function () {
            if (!_this.is_loading) {
                //fix missing words from autofill input
                angular.element(document.querySelectorAll('input, textarea, select')).trigger('blur');

                var options = (in_app) ? new FileUploadOptions() : {};

                options.fileKey = "file";
                if (_this.fileCapture.fileName) {
                    options.fileName = _this.fileCapture.fileName;
                } else {
                    options.fileName = _this.fileURL.substr(_this.fileURL.lastIndexOf('/') + 1);
                }
                if (_this.fileCapture && _this.fileCapture.type) {
                    options.mimeType = _this.fileCapture.type;
                }
                if (!_this.contentTitle) {
                    _this.contentTitle = options.fileName;
                }

                var params = {};
                params.name = _this.contentTitle;
                params.description = _this.contentDescription;
                params.entity_code = callApi.state.stackid;
                params.labels = _this.tile.settings.collection_name;
                params.ref_type = "file";

                options.params = params;
                options.headers = AccessToken.getAuthHeader();
                options.headers['Accept'] = 'application/json, text/plain, */*';
                var uri = callApi.apisettings.api_uri + callApi.apisettings.api_reference;

                deblog("Call to Api: ", uri);
                deblog("Options: ", options);
                _this.is_loading = true;
                _this.fileProgress = false;
                if (in_app) { //The user is in the app and so cordova and FileTransfer is available
                    this.ft = new FileTransfer();
                    this.ft.onprogress = function (evt) {
                        if (evt.lengthComputable) {
                            $scope.$apply(function () {
                                _this.fileProgress = parseInt(100.0 * evt.loaded / evt.total);
                            });
                        }
                    };
                    this.ft.upload(_this.fileURL, encodeURI(uri), _this.uploadSuccess, _this.uploadFail, options);//            }, 0);
                }
            }
        };

        this.abortUploadFile = function () {
            if (in_app && this.ft) {
                this.ft.abort();
            }
        };

        this.fileIcon = function (ref) {
            return sfsService.fileIcon(ref);
        };

        this.init();
    }])

.controller('collectionMenuController', ['tileState', 'callApi', 'sfsService', '$scope', '$rootScope',
    function (tileState, callApi, sfsService, $scope, $rootScope) {
        this.selectedTile = tileState.selectedTile;
        this.visible_add_url_form = false;
        this.visible_add_file_form = false;
        this.visible_add_reference_form = false;
        this.stackid = callApi.state.stackid;
        this.reference_count = 0;
        this.open_add_ref = false;
        this.collection_tile_sizes = [
            {name: "normal", value: "normal"},
            {name: "double", value: "double"},
            {name: "double-down", value: "double-down"}
        ];
        this.user_input_types = sfsService.user_input_types;
        var _this = this;

        this.tileDelete = function () {
            tileState.tileDelete();
        };

        $rootScope.$on('tilestate:setTile', function () {
            _this.selectedTile = tileState.selectedTile;
            _this.stackid = callApi.state.stackid;
            if(_this.selectedTile.settings){
                _this.collection_name_change();
            }
        });

        if (!this.selectedTile.settings.collection_name) {
            $scope.collectionname_edit = true;
        }

        $rootScope.$on('sfsService:update', function (updates) {
            _this.reference_count = updates.reference_count;
            //In case this was caused by the addition of a new reference
            //we close now that form
            _this.cancelAddReferenceForm();
        });

        this.allow_upload = function (value) {
            tileState.selectedTile.settings.allow_upload = value;
        };

        this.collection_name_change = function () {
            if (this.selectedTile.settings.collection_name) {
                $rootScope.$broadcast('sfsService:collection_name_change', this.selectedTile.settings.collection_name);
                return true;
            } else {
                return false;
            }
        };

        this.cancelAddReferenceForm = function () {
            this.visible_add_reference_form = false;
            this.visible_add_url_form = false;
            this.visible_add_file_form = false;
            this.open_add_ref = false;
        };

        this.addReferenceForm = function () {
            this.visible_add_reference_form = true;
            this.visible_add_url_form = false;
            this.visible_add_file_form = false;
            this.open_add_ref = true;
        };

        this.addFileForm = function () {
            this.visible_add_file_form = true;
            this.visible_add_url_form = false;
            this.visible_add_reference_form = false;
            this.open_add_ref = true;
        };

        this.addUrlForm = function () {
            this.visible_add_url_form = true;
            this.visible_add_file_form = false;
            this.visible_add_reference_form = false;
            this.open_add_ref = true;
        };
    }])
;
