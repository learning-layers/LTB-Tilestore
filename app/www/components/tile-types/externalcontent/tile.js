'use strict';

tileTypes
.run(['tileState', 'gettext', function(tileState, gettext){
    tileState.addTemplate({
        deprecated: true,
        type: "externalcontent",
        size: "",
        colour: "blue",
        icon: "list-alt",
        name: gettext("External Content"),
        description: gettext("A listing of one or more external content items"),
        image_url: path_root + 'assets/resources/tile-embed.png',
        image_from_content: "",
        template: {
            type: "externalcontent",
            size: "double",
            colour: "blue",
            icon: "list-alt",
            name: gettext("New External Content"),
            position: 0,
            settings: {
                externalcontent : []
            }
        }
    }
    );
}])
.controller('externalcontentTileController', ['tileState', 'callApi', '$scope', '$rootScope', 'applicationFunctions',
    function (tileState, callApi, $scope, $rootScope, applicationFunctions) {
    //make sure the inserted tile is not a template
    if (!$scope.tilereadonly && callApi.state.tiles[$scope.tileindex].template){
        callApi.state.tiles[$scope.tileindex] = callApi.state.tiles[$scope.tileindex].template;
        $scope.tile = callApi.state.tiles[$scope.tileindex];
    }
    
    this.tileEdit = function ($event) {
        tileState.tileEdit($event, $scope.tile, $scope.tileindex);
    };
    
    this.tileClick = function ($event) {
        if (!$scope.tiletemplate) {
            $(window).scrollTop(0);
            tileState.toggleSelect($event, 'off');
            tileState.setTile($scope.tile, "full", $scope.tileindex);
        }
    };
    
    this.openExternal = function(url){
        return applicationFunctions.openExternal(url);
    };
    
    $rootScope.$on('LTBApp.stack: close active tile', function(){
        if ($scope.tile.tile_id === tileState.tileEdit_id) {
            tileState.tileEdit();
        }
    });
    
    this.tileTemplateUrl = function(){
      return tileState.getTileUrl('externalcontent');
    };
    
    this.openExternal = function(url, block){
        sfsService.openExternal(url, block);
    };
}])

.controller('externalcontentFullController', ['tileState', 'trust', 'callApi', '$scope', '$location', 'deviceDetector',
    function(tileState, trust, callApi, $scope, $location, deviceDetector){
        
    this.os = deviceDetector.os;
    this.edit_stack = tileState.edit_stack;  
    this.tile = tileState.selectedTile;
    this.nr_externalcontent = this.tile.settings.externalcontent.length;
    var _this = this;
    
    this.init = function(){
        _this.loading = callApi.loading_queue;
        if(this.tile.settings.externalcontent.length === 1){
            this.play(this.tile.settings.externalcontent[0],true);
        }
    };
    
    //Make sure the user has entered an absolute address. If it started with http(s) 
    //keep the address (and protocol) otherwise assume it is http://...
    var absUrl = function(link){
        if (link.indexOf('http') === 0){
            return link;
        } else {
            return 'http://'+ link;
        }
    };
    
    this.play = function(entity, nosub){
        var protocol = ($location.protocol() === 'https')?'https':'http';
        this.entity = entity;
        if(this.entity.media && this.entity.media.html){
            this.entity.embed = this.entity.media;
            var html = this.entity.embed.html;
            html = html.replace('src=\"//cdn.embed', 'src=\"'+protocol+'://cdn.embed');
            if(protocol === 'https'){
                html = html.replace('src=\"http://cdn.embed', 'src=\"https://cdn.embed');
            }else if(protocol === 'http'){
                html = html.replace('src=\"https://cdn.embed', 'src=\"http://cdn.embed');
            }
            
            if(this.os === 'ios'){
                html = html.replace('<iframe', '<iframe sandbox="allow-scripts allow-same-origin allow-forms"');
            }

            this.entity.media.htmlSafe = trust.html(html);
            
            this.entity.embed.content_class = '';
            this.entity.embed.content_extra = '';
            if (this.entity.embed.type === 'video' || this.entity.embed.type === 'rich'){
                // Figure out the percent ratio for the padding. This is (height/width) * 100
                var ratio = ((this.entity.embed.height/this.entity.embed.width)*100).toPrecision(4) + '%';
                this.entity.embed.content_class = 'embed-responsive-object';
                this.entity.embed.content_extra = ' style="paddingBottom: '+ratio+';" ';
            }
        }
        
        deblog('play', this.entity);
        if(!nosub){
            tileState.subscreen = 1;
        }
    };
    
    this.subscreen = function(){
        return tileState.subscreen;
    };
    
    this.tileClose = function ($event) {
        if(tileState.subscreen === 0){
            tileState.setTile();
        }else{
            tileState.subscreen = tileState.subscreen-1;
        }
    };
    this.init();
}])

.controller('externalcontentMenuController', ['tileState', 'callApi', function(tileState, callApi){
    this.selectedTile = tileState.selectedTile;
    this.url = '';
    this.image
    callApi.registerLoading('getLinkInformation');
    
    this.tileDelete = function (){
        tileState.tileDelete();        
    };
    
    var _this = this;
    this.addLink = function(){        
        var params = {
            width: '',
            height: '',
            scheme: callApi.device.scheme
        };
        callApi.getLinkInformation([this.url], 'extract', params, function(data){
            var entity = data[0];
            delete entity.content;
            if (entity.images && entity.images.length){
                entity.image_url = entity.images[0].url;
            }
            _this.selectedTile.settings.externalcontent.push(entity);
            deblog('addlink', _this.selectedTile.settings.externalcontent);
            _this.url = '';
            if (_this.selectedTile.image_url === '' 
                    && _this.selectedTile.settings.externalcontent.length === 1 
                    && entity.image_url) {
                _this.selectedTile.settings.image_url = _this.selectedTile.image_url;
                _this.image_from_content = _this.selectedTile.settings.image_url;
                _this.selectedTile.image_url = entity.image_url;
            } else if (_this.selectedTile.settings.externalcontent.length === 2 && _this.selectedTile.image_url !== path_root + 'assets/resources/tile-embed.png') {
                if (_this.selectedTile.settings.image_url) {
                    _this.selectedTile.image_url = _this.selectedTile.settings.image_url;
                    _this.image_from_content = _this.selectedTile.settings.image_url;
                } else if (_this.image_from_content === _this.selectedTile.image_url){
                    _this.selectedTile.image_url = '';
                }
                _this.selectedTile.settings.image_url = '';
            }
        });
    };
    
    this.removeLink = function(item){
        var index = this.selectedTile.settings.externalcontent.indexOf(item);
        this.selectedTile.settings.externalcontent.splice(index, 1);
        if (this.selectedTile.settings.externalcontent.length === 1
                && this.selectedTile.settings.externalcontent[0].image_url) {
            this.selectedTile.settings.image_url = this.selectedTile.image_url;
            this.selectedTile.image_url = this.selectedTile.settings.externalcontent[0].image_url;
        } else if (this.selectedTile.settings.externalcontent.length === 0) {
            if (this.selectedTile.settings.image_url && _this.image_from_content !== _this.selectedTile.image_url) {
                this.selectedTile.image_url = this.selectedTile.settings.image_url;
            } else if (_this.image_from_content === _this.selectedTile.image_url){
                this.selectedTile.image_url = '';
            }
            this.selectedTile.settings.image_url = '';
        }
    };
}]);
