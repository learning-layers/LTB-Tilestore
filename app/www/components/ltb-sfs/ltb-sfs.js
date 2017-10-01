angular.module('LTBApp.sfs', [])

.service('sfsService', ['callApi', 'trust', '$rootScope', '$filter', 'alerts',
    'AccessToken', 'gettextCatalog', 'applicationFunctions', 'sharedFunctions',
    function(callApi, trust, $rootScope, $filter, alerts, AccessToken,
        gettextCatalog, applicationFunctions, sharedFunctions){
    var _this = this;
    this.labels = [];
    this.references = [];
    this.stack_code = false;
    this.has_collections = false;
    
    this.user_input_types = [
        {
            key: "photo",
            value: gettextCatalog.getString("Photo"),
            types: ['image'],
            active: true
        },
        {
            key: "video",
            value: gettextCatalog.getString("Video"),
            types: ['video'],
            active: true
        },
        {
            key: "audio",
            value: gettextCatalog.getString("Audio"),
            types: ['audio'],
            active: true
        },
        {
            key: "file",
            value: gettextCatalog.getString("File"),
            types: ['application/pdf'],
            active: true
        },
        {
            key: "text",
            value: gettextCatalog.getString("Text"),
            types: [],
            active: true
        }
    ];
    
//    callApi.registerLoading('searchReferences', true);
//    callApi.registerLoading('saveReference', false);
//    callApi.registerLoading('getLinkInformation', false);
//    callApi.registerLoading('deleteReference', false);
    
    this.init = function(stack_code, is_reload){
        if (!stack_code){
            stack_code = callApi.state.stackid;
        }
        //Has current stack collections at all? Otherwise it makes no sense to 
        //retrieve the list of references. The callApi.state.stack.screens reflects
        //the screens of the current stack. Note that this init is only called upon 
        //a stack open event being fired.
        var nr_screens = callApi.state.stack ? callApi.state.stack.screens.length : 0;
        
        if (nr_screens){
            for (var i=0;i< nr_screens; i++){
                if ($filter('filter')(callApi.state.stack.screens[i].tiles, {type: 'collection'}).length){
                    _this.has_collections = true;
                    break;
                }
            }
        }
        //If there is reason to retrieve collections for this stack
        if (_this.has_collections && (is_reload || (stack_code !== _this.stack_code))){
            callApi.searchReferences({entity_code: stack_code}, function(results){
                _this.digestReferences(results, stack_code, null);
            });
        }
    };
    
    this.digestReferences = function(results, stack_code, labels){
        if (results._embedded) {
            if (! labels){
                if (results._embedded.labels){
                    _this.labels = results._embedded.labels;
                } else {
                    _this.labels = [];
                }
            }
            if (results._embedded.reference){
                var len = results._embedded.reference.length;
                for (var i = 0; i< len; i++){
                    if (results._embedded.reference[i].details){
                        results._embedded.reference[i].details = results._embedded.reference[i].details ? 
                            angular.fromJson(results._embedded.reference[i].details) : 
                            '';
                    }   
                }
                _this.references = results._embedded.reference;
            } else {
                _this.references = [];
            }
            _this.stack_code = stack_code;
            //Send the collection name along when new references where retrieved due
            //to update to specific collection
            _this.broadcastUpdatedRefs(labels? labels[0]: '');
        }
    };
    
    this.openExternal = function(url){
        applicationFunctions.openExternal(url);
    };
    
    this.tileStyle = function(tile){
        var style = "";
        var image_url = "";
        if (tile.image_url){
            //this is for tiles
            image_url = tile.image_url;
        } else if (tile.settings && tile.settings.thumbnail_url){
            //this is for backwards compatibility with embed tile
            image_url = tile.settings.thumbnail_url;
        } else if (tile.details && tile.details.image_url){
            //this is for indiv references
            image_url = tile.details.image_url;
        } 
        
        if (image_url){
            image_url = applicationFunctions.addTokenToUrl(image_url);
            image_url = applicationFunctions.addSizeToUrl(image_url,400,400);
            style += "background-image: url('"+image_url+"');";
            style += "background-size: 100%; background-repeat: no-repeat; background-size: cover; background-position: center top;";
        }
        return style;
    };
    
    this.tileAutoContent = function(tile, multiplier){
        var content = '';
        var fontawesome_multiplier = multiplier ? multiplier : 5;
        if (!this.tileStyle(tile)){
            content = '<i class="fa fa-'+fontawesome_multiplier+
              'x '+this.fileIcon(tile)+'"></i>';
            
        }
        content = trust.html(content);
        return content;
    };
    
    this.broadcastUpdatedRefs = function(collection_name, reference_code, is_new){
        var broadcast_data = {
             stack_code: this.stack_code,
             labels: this.labels,
             references: this.references,
             reference_count: this.references.length,
             reference_code: reference_code ? reference_code : null,
             is_new: is_new ? true : false
        };
        if (collection_name){
            broadcast_data.collection = collection_name;
        }
        deblog('broadcasting now sfsService:update with', broadcast_data);
        $rootScope.$broadcast('sfsService:update', broadcast_data);            
    };
    
    this.countRefs = function(label){
        return this.selectRefs(label).length;
    };
    
    this.selectRefs = function(label){
        var obj = {};
        obj[label] = 1;
        return $filter('filter')(this.references, {labels: obj});
    };
    
    this.deleteRef = function(reference_code){
        callApi.deleteReference(reference_code, function(){
            var len = _this.references.length;
            for (var i=0;i < len; i++){
                if (_this.references[i].reference_code === reference_code){
                    var label = _this.references[i].labels ? _this.references[i].labels[0]: '';
                    _this.references.splice(i, 1);
                    alerts.add(gettextCatalog.getString('Succesfully removed the item'), 'success');
                    _this.broadcastUpdatedRefs(label);
                    break;
                }
            }
        });
    };
    
    this.deleteMultipleRef = function(ref_list, callback){
        var stack_code = ref_list[0].entity_code;
        var ref_codes = sharedFunctions.findKeysInObjectList(ref_list, 'reference_code');
        deblog(' wat komen er voor refs binnen en labels', ref_list, ref_codes,  this.labels);
        callApi.deleteReferenceList(ref_codes, stack_code, this.labels, function(result){
            alerts.add(gettextCatalog.getString('Collection items succesfully removed. Updating now'));
            if (callback){
                callback(result);
            }
            var current_collection_search_data = {
                entity_code: _this.stack_code,
                labels: _this.labels
            };
            
            callApi.searchReferences(current_collection_search_data, function(results){
                _this.digestReferences(results, _this.stack_code, _this.labels);
            });
        });
    };
    
    this.addUrlRef = function(collection, new_url, onsuccess){        
        var params = {
            width: '',
            height: '',
            scheme: callApi.device.scheme
        };
        callApi.getLinkInformation([new_url], 'extract', params, function(data){
            var entity = data[0];
            delete entity.content;
            //TODO let the user choose which picture to use
            if (entity.images && entity.images.length){
                entity.image_url = entity.images[0].url;
            }

            var new_ref = {
                reference_code: 0,
                entity_code: callApi.state.stackid,
                labels: collection,
                ref_type: 'link',
                link: new_url,
                name: entity.title,
                description: entity.description,
                details: entity                
            };
            
            var callback = function(data){
                _this.init();
                data.result.details = angular.fromJson(data.result.details);
                
                if (onsuccess){
                   onsuccess(data);
                }
            };
            
            callApi.saveReference(new_ref, callback, 'saveNewReference');
        });
    };

    this.addExistingRef = function(collection, reference_code, onsuccess){
        callApi.addReferenceToFolder(collection, reference_code, function(results){
            _this.init();
        });
    };
    
    this.updateMyReferences = function(ref, reference_code, is_addition){
        deblog('updating my references', ref, reference_code, is_addition);
        if (is_addition){
            //By inserting at the front, the ref is shown at the top of the list
            //the first time. After it is ordered according the order defined at the
            //server
             _this.references.splice(0, 0, ref);
        } else {
            var len = _this.references.length;
            for (var i=0;i < len; i++){
                if (_this.references[i].reference_code === reference_code){
                    _this.references.splice(i, 1, ref);
                    break;
                }
            }
        }
        _this.broadcastUpdatedRefs(null, reference_code, is_addition);
    };
    
    this.saveRef = function(ref){
        var is_new = (typeof ref.reference_code === 'undefined' || !ref.reference_code);
        var reference_code = is_new ? '' : ref.reference_code;
        callApi.saveReference(ref, function(results){
            results.result.details = results.result.details ? 
                angular.fromJson(results.result.details) : '';
            _this.updateMyReferences(results.result, reference_code, is_new);
        });
    };
    
    this.is_type = function(file_type, main_type, sub_type){
        var parts = file_type.split('/');
        var ref_main_type = parts.shift();
        if (sub_type){
            var ref_sub_type = parts.shift();
            return (main_type === ref_main_type && sub_type === ref_sub_type);
        } else {
            return (main_type === ref_main_type);
        }
    };
    
    this.fileIcon = function(ref, dohex){
        if(!ref || !ref.ref_type){
            return '';
        }
        if(ref.ref_type !== 'file'){
            return 'fa-globe';
        }else{
            var file_type = ref.file_type.split('/').shift();
            var icon = 'fa-file';
            var hex = 'f15b';
            switch(file_type){
                case 'image':
                    icon = 'fa-picture-o';
                    hex = 'f03e';
                    break;
                case 'audio':
                    icon = 'fa-volume-up';
                    hex = 'f028';
                    break;
                case 'video':
                    icon = 'fa-video-camera';
                    hex = 'f03d';
                    break;
                case 'application':
                    var parts = ref.file_type.split('/');
                    var ref_main_type = parts.shift();
                    var ref_sub_type = parts.shift();
                    switch (ref_sub_type){
                        case 'pdf':
                            icon = 'fa-file-pdf-o';
                            hex = 'f1c1';
                            break;
                    }
                    break; 
            }
            if(dohex){
                return hex;
            } else {
                return icon;
            }
        }
        
    };
    
    $rootScope.$on('sfsService:collection_name_change', function(){
        if(!_this.has_collections){
            _this.init(_this.stack_code);
        }
    }); 
    
    $rootScope.$on('ltbapi:stack reload', function(e, stack_code){
        _this.init(stack_code, true);
    });
    
     $rootScope.$on('ltbapi:stack open', function(e, stack_code){
        _this.init(stack_code, false);
    });
}])

.controller('sfsController', ['alerts', 'callApi', 'sfsService', '$rootScope', 
    '$scope', 'Upload', 'AccessToken', 'gettextCatalog',
    function(alerts, callApi, sfsService, $rootScope, $scope, Upload, AccessToken, gettextCatalog){
    var _this = this;
    this.loading = callApi.loading_queue;
    this.labels = sfsService.labels;
    this.references = sfsService.references;
    
    this.selected_label = '';
    this.selected_reference = '';
    this.stack_code = false;
    this.active_label = $scope.collection;
    this.visible_edits = {};
    this.current_url = false;
    this.new_url = '';
    this.is_edit = false;
    this.current_values = {};
    this.old_refs = [];
    this.progressperc = false;
    
    //Some translations
    this.descr_txt = gettextCatalog.getString('Description');
    this.title_txt = gettextCatalog.getString('Title');
    
    this.obj = {};
    this.obj[$scope.collection] = 1;
    this.filter_object = {labels : this.obj};
    
    this.uploadFile = function (file) {
        deblog('uploadFile', file);
        var data = {
            file: file,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            entity_code: callApi.state.stackid,
            labels: $scope.collection,
            ref_type: 'file'
        };
        
        callApi.startLoadingEvent('post', 'saveNewReference');
        
        Upload.upload({
            url: callApi.apisettings.api_uri + callApi.apisettings.api_reference,
            headers: AccessToken.getAuthHeader(),
            data: data
        }).then(function (response) {
            console.info('onSuccessItem', response);
            var result = response.data.result;
            if (result.details){
                result.details = angular.fromJson(result.details);
            }
            sfsService.updateMyReferences(result, result.reference_code, true);
            alerts.add(gettextCatalog.getString('Successfully added the file to your collection.'), 'success');
            callApi.stopLoadingEvent('post', 'saveNewReference');
            _this.progressperc = false;
        }, function (response) {
            console.info('In Error case of Upload.upload: response and sent data', response, data);
            alerts.add(gettextCatalog.getString('File upload failed.'), 'danger');
            callApi.stopLoadingEvent('post', 'saveNewReference');
            _this.progressperc = false;
        }, function (evt) {
            _this.progressperc = parseInt(100.0 * evt.loaded / evt.total);
            
        });
    };
    
    this.init = function(){
        this.open_references = {};
        //If a collection is provided, prepare the filter object to filter references for this folder
        
        if ($scope.collection){
            this.makeActive($scope.collection);
        }
        deblog('sfsController init: collection and filter obj:', $scope.collection, this.filter_object);
    };
    
    this.makeActive = function(label){
        this.active_label = label;
        var obj = {};
        obj[this.active_label] = 1;
        this.filter_object = {labels : obj};
    };  
    
    this.addRef = function(ref_type) {
        var callback = function(results){
            _this.new_url = '';
            if (results.result){
                //Add the new ref to the list
                sfsService.updateMyReferences(results.result, results.result.reference_code, true);
                alerts.add(gettextCatalog.getString('Successfully added the url to your collection.'), 'success');
            }
        };

        if (ref_type === 'file'){
            _this.uploader.uploadItem(this.uploader.queue[0]);
        } else {
            sfsService.addUrlRef($scope.collection, _this.new_url, callback);
        }
    };
    
    this.addExistingReference = function(reference_code, callback){
        sfsService.addExistingRef($scope.collection, reference_code, callback);
    };
    
    this.removeRef = function (reference_code){
        sfsService.deleteRef(reference_code);
    };
    
    this.editRef = function(item, index){
        this.current_url = item.url;
        this.old_refs[index] = angular.copy(item);
        this.is_edit = true;
        this.visible_edits = {};
        this.visible_edits[item.reference_code] = true;
    };
    
    this.cancelEdit = function(ref, index){
        this.removeTemporalRef(ref, index);
        this.visible_edits[ref] = false;
        this.is_edit = false;
    };
    
    this.removeTemporalRef = function(reference_code, index){
        var i=0;
        for (var i = 0; i < this.references.length; i++) {
            if(this.references[i].reference_code === reference_code)
                this.references.splice(i,1, this.old_refs[index]);
        }
    };
    
    this.saveEdit = function(item){
        var new_properties = {
            reference_code: item.reference_code,
            name: item.name,
            description: item.description,
            details: item.details
        };
        sfsService.saveRef(new_properties);
        this.visible_edits[item.reference_code] = false;
        this.is_edit = false;
    };
    
    $rootScope.$on('sfsService:update', function(e, updates){
        _this.labels = updates.labels;
        _this.references = updates.references;
        if (updates.reference_code){
            _this.open_references[updates.reference_code] = true;
            if (updates.is_new){
                this.visible_edits = {};//Clear all other open edits
                _this.visible_edits[updates.reference_code] = true;
            }
        }
    });
    
    $rootScope.$on('sfsService:collection_name_change', function(e, collection){
        $scope.collection = collection;
        _this.init();
    });            
    
    this.init();
}])

.controller('sfsPlayerController', ['sfsService', 'applicationFunctions',
    function(sfsService, applicationFunctions){
        
    this.is_type = function(ref, main_type, sub_type){
        if (!ref || !ref.file_type){
            return false;
        }
        return sfsService.is_type(ref.file_type, main_type, sub_type);
    };
    
    this.openExternal = function(url){
        applicationFunctions.openExternal(url);
    };
    
    this.addTokenToUrl = function (url) {
        return applicationFunctions.addTokenToUrl(url);
    };
    
    
}])
//<reference-select></reference-select>//This adds an existing reference as reference
.directive('referenceSelect', [function(){
    return {
      restrict: "E",
      templateUrl: path_root + "components/ltb-sfs/reference-select.html",
      controller: 'sfsController',
      controllerAs: 'sfsCtrl'
    };
}])
//<reference-view></reference-view>
.directive('referenceView', [function(){
    return {
      restrict: "EA",
      scope: {
        collection: "="
      },
      templateUrl: path_root + "components/ltb-sfs/reference-view.html",
      controller: 'sfsController',
      controllerAs: 'sfsCtrl'
    };
}])
//<reference-add></reference-add>
.directive('referenceAdd', [function(){
    return {
      restrict: "E",
      scope: {
        show: "=",
        collection: "=",
        reftype: "@"
      },
      templateUrl: path_root + "components/ltb-sfs/reference-add.html",
      controller: 'sfsController',
      controllerAs: 'sfsCtrl'
    };
}])

.directive('referencePlayer', [function(){
    return {
        restrict: "E",
        scope: {
            ref: "="
        },
        templateUrl: path_root + "components/ltb-sfs/reference-player.html",
        controller: 'sfsPlayerController',
        controllerAs: 'sfsPCtrl'
    };
}])

.directive('referenceFilePlayer', [function(){
    return {
        restrict: "E",
        templateUrl: path_root + "components/ltb-sfs/reference-file-player.html"
    };
}])

.directive('referenceLinkPlayer', ['trust', '$location', function(trust, $location){
    return {
        restrict: "E",
        link: function(scope, element, attrs){
            
            var fixEmbed = function(new_ref) {
                var protocol = ($location.protocol() === 'https')?'https':'http';
                deblog('refLinkPlayer scope ref and new_ref', scope.ref, new_ref);
                if (new_ref && new_ref.details && new_ref.details.media && new_ref.details.media.html){
                    scope.ref.embed = scope.ref.details.media;
                    var html = scope.ref.embed.html;
                    html = html.replace('src=\"//cdn.embed', 'src=\"'+protocol+'://cdn.embed');
                    if(protocol === 'https'){
                        html = html.replace('src=\"http://cdn.embed', 'src=\"https://cdn.embed');
                    }else if(protocol === 'http'){
                        html = html.replace('src=\"https://cdn.embed', 'src=\"http://cdn.embed');
                    }

                    if (this.os === 'ios'){
                        html = html.replace('<iframe', '<iframe sandbox="allow-scripts allow-same-origin allow-forms"');
                    }

                    scope.ref.embed.htmlSafe = trust.html(html);
                    scope.ref.embed.content_class = '';
                    scope.ref.embed.content_extra = '';
                    if (scope.ref.embed.type === 'video' || scope.ref.embed.type === 'rich'){
                        // Figure out the percent ratio for the padding. This is (height/width) * 100
                        var ratio = ((scope.ref.embed.height/scope.ref.embed.width)*100).toPrecision(4) + '%';
                        scope.ref.embed.content_class = 'embed-responsive-object';
                        scope.ref.embed.content_extra = ' style="paddingBottom: '+ratio+';" ';
                    }
                } else {
                    deblog('It was not a valid link . No detail found about media.', new_ref);
                }
            };
            
            //TODO: is this call needed as wel already have a watch
            if (scope.ref){
                fixEmbed(scope.ref);
            }
            
            scope.$watch('ref', fixEmbed);
        },
        templateUrl: path_root + "components/ltb-sfs/reference-link-player.html"
    };
}])

.directive('referenceImagePlayer', ['applicationFunctions', function(applicationFunctions){
    return {
        restrict: "E",
        scope: {
            ref: "=",
            show: "="
        },
        link: function(scope, element, attrs){          
           
            scope.$watch('ref', function(new_val) {
                if (scope.show && new_val){
                    scope.image_url = applicationFunctions.addTokenToUrl(new_val.details.image_url);
                    
                }
            }); 
        },
        templateUrl: path_root + "components/ltb-sfs/reference-image-player.html"
    };
}])

.directive('referencePdfPlayer', ['applicationFunctions', '$window', '$timeout',
    function(applicationFunctions, $window, $timeout){
    return {
        restrict: "E",
        scope: {
            url: "=",
            ref: "=",
            show: "="
        },
        link: function(scope, element, attrs){
            scope.viewerHeight = '600px';
            
           
            scope.$watch('url', function(new_val) {
                if (scope.show && new_val){
                    var new_url = applicationFunctions.addTokenToUrl(new_val);
                    
                    //loads the pdf viewer (which is called viewerJS)
                    scope.pdfUrl = path_root + "viewerjs.html?title=" + scope.ref.name + "#" + new_url;
                    
                    var timeout = $timeout(function(){
                        var rect = document.getElementsByTagName("iframe")[0].getBoundingClientRect();
                        var height = window.innerHeight - rect.top - 20;
                        scope.viewerHeight = height + 'px';
                        
                    }, 0);
                } else {
                    deblog('It was not a valid pdf new val we want to use or show was off.', new_val);
                }
            });     
//            scope.onHammer = function(event){
//                var playerscope = element.find("ng-pdf").scope();
//                deblog('onHammer', event);
//                
//                switch(event.type) {
//                    case "doubletap":
//                        playerscope.zoomIn();
//                        break;
//                    case "pinchin":
//                        playerscope.zoomOut();
//                        break;
//                    case "pinchout":
//                        playerscope.zoomIn();
//                        break;
//                }
//                if(event.type === "doubletap"){
//                    playerscope.zoomIn();
//                }else if(event.type === "pinchin"){
//                    
//                }else
//                scope.eventType = event.type;            
//            };
        },
        templateUrl: path_root + 'components/ltb-sfs/reference-pdf-player.html'
        
    };
}])
.directive('referenceHtmlPlayer', ['applicationFunctions', 'trust', '$timeout', 
        function(applicationFunctions, trust, $timeout){
    return {
        restrict: "E",
        scope: {
            url: "=",
            ref: "=",
            show: "="
        },
        link: function(scope, element, attrs){
            scope.viewerHeight = '400px';
            
            scope.$watch('url', function(new_val) {
            
                if (scope.show && new_val){
                    var new_url = applicationFunctions.addTokenToUrl(new_val);
                    if(new_url.indexOf('?token=') < 0){
                        new_url += '?';
                    }else{
                        new_url += '&';
                    }
                    new_url += "stream=1";
                    scope.htmlUrl = trust.url(new_url);
                    
                    var timeout = $timeout(function(){
                        var rect = document.getElementsByTagName("iframe")[0].getBoundingClientRect();
                        var height = window.innerHeight - rect.top - 20;
                        scope.viewerHeight = height + 'px';
                        
                    }, 0);
                } else {
                    
                }
            }); 
            
//            window.iframeLoaded = function(){
//                var innerheight = document.getElementsByTagName("iframe")[0].contentWindow.document.body.scrollHeight;
//                if(innerheight > 400){
//                    scope.viewerHeight = innerheight;
//                }
//            }
        },
        templateUrl: path_root + 'components/ltb-sfs/reference-html-player.html'
        
    };
}])
.directive('referenceAudioPlayer', ['ngAudio', 'trust','$timeout',
        function(ngAudio, trust, $timeout){
    return {
        restrict: "E",
        scope: {
            ref: "=",
            show: "="
        },
        controller: ["applicationFunctions", "callApi", "ngAudio", "$scope", "$rootScope",
            function(applicationFunctions, callApi, ngAudio, $scope, $rootScope) {
//            var audio;
            var _this = this;
            this.path = '';
            $scope.loading = true;
            $scope.progressStyle = function(){
                var progress = ($scope.audio)?$scope.audio.progress * 100:0;
                return {
                    'width': progress + "%"
                };
            };
                
            $scope.openExternal = function(url){
                applicationFunctions.openExternal(url);
            };
            
            $scope.$watch('ref', function(new_val) {
                deblog(' A new ref has been detected ', new_val);
                if (new_val && $scope.show){
                    var path = applicationFunctions.addTokenToUrl(new_val.url);
                    //In case the path is stored as a relative path
                    if (path.indexOf(callApi.apisettings.api_uri) === -1 &&
                          path.indexOf("file:") === -1 ){
                        path = callApi.apisettings.api_uri + path;
                    }
                    _this.path = path;
                    deblog('ref has been changed', new_val, $scope.path, path);
                    if ($scope.path !== path){
                        $scope.volume = "0.2";
                        $scope.audioUrl = path+ "?stream=1";//trust.url(path+ "?stream=1");
                        $scope.loading = true;
                        $scope.path = path;
                        
                        //From docs
                        
                        $scope.audio = ngAudio.load($scope.audioUrl, $scope);                        
                        $scope.audio.volume = 0.8;
                        $scope.audio.currentTime = $scope.start || 0;
                        $timeout(function() {
                            $scope.audio.play();
                        }, 0);
                   }
                } else {
                    deblog('It was not a valid audio new val we want to use or show was off', new_val);
                }
            });
            $scope.skip = function(t){
                if(!t){
                    t = 0;
                }
                $scope.audio.setCurrentTime(t);
            }
            
            $scope.stop = function(){
                $scope.audio.pause();
                $scope.skip(0);
            };
            
            $scope.skipTo = function(event){
                if ( event.offsetX == null ) { // Firefox
                    var mouseX = event.originalEvent.layerX;
                    var mouseY = event.originalEvent.layerY;
                } else {                       // Other browsers
                    var mouseX = event.offsetX;
                    var mouseY = event.offsetY;
                }
                
                if(event.target.clientWidth){
                    $scope.audio.pause();
                    $timeout(function() {
                        var progress = mouseX / event.currentTarget.clientWidth;
                        $scope.skip($scope.audio.duration * progress);
                        $timeout(function() {
                            $scope.audio.play();
                        }, 0);
                    }, 0);
                }
                
            };
            
            $rootScope.$on('navigate:cleanup', function() {
                deblog('navigate:cleanup', $scope.audio, _this.path);
                if($scope.audio){
                    $scope.audio.stop();
                }
            });

        }],
        templateUrl: path_root + "components/ltb-sfs/reference-audio-player.html"
        
    };
}])
.directive('referenceVideoPlayer', ['$timeout',
    function($timeout){
    return {
        restrict: "E",
        scope: {
            ref: "=",
            show: "="
        },
        controller: ["applicationFunctions", "callApi", "$scope", "$rootScope",
            function(applicationFunctions, callApi, $scope, $rootScope) {
            $scope.loading = true;
            $scope.videoSources = [];
            
            $scope.$watch('ref', function(new_val) {
                deblog(' A new ref has been detected ', new_val);
                if (new_val && $scope.show){
                    var path = applicationFunctions.addTokenToUrl(new_val.url);
                    //In case the path is stored as a relative path
                    if (path.indexOf(callApi.apisettings.api_uri) === -1 &&
                          path.indexOf("file:") === -1 ){
                        path = callApi.apisettings.api_uri + path;
                    }
                    
                    if ($scope.path !== path){
                        $scope.videoSources = [{
                            src: path+ "?stream=1",
                            type: new_val.file_type,
                            media: "screen"
                          }];
                        $scope.loading = true;
                        $scope.path = path;
                        var timeout = $timeout(function(){
                            document.getElementsByTagName("video")[0].load();
                            
                            if (screen){
                                //catch video fullscreen change events
                                angular.element(document).find("video").bind('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(e) {
                                    var state = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
                                    var event = state ? 'FullscreenOn' : 'FullscreenOff';
                                    
                                    if (event === "FullscreenOff"){
                                        // allow user rotate
                                        screen.unlockOrientation();
                                    } else {
                                        // set to either landscape
                                        screen.lockOrientation('landscape');
                                    }
                                });
                            }
                        
                        }, 0);
                   } 
                }
            });
                        
            $rootScope.$on('navigate:cleanup', function() {
                if ($scope.path){
                    document.getElementsByTagName("video")[0].pause();
                    if (screen){
                        screen.unlockOrientation();
                    }
                }
            });

        }],
        templateUrl: path_root + "components/ltb-sfs/reference-video-player.html"
        
    };
}])
.controller({
  'html5VideoController': html5VideoController
})
.directive({
  'html5Video': html5Video
});
