'use strict';

tileTypes

.run(['tileState', 'gettext', function(tileState, gettext){
    tileState.addTemplate({
        deprecated: true,
        type: "localcontent",
        size: "",
        colour: "orange",
        icon: "picture-o",
        name: gettext("Local Content"),
        description: gettext("Supply local content"),
        image_url: path_root + 'assets/resources/tile-localcontent.jpg',
        template: {
            size: "normal",
            colour: "orange",
            name: gettext("New Local Content"),
            icon: "picture-o",
            position: 0,
            settings: {
                search_type: 'words',
                entity_type: 'video',
                search_tags: '',
                search_terms: ''
            },
            type: "localcontent"
        }
    }
    );
}])
.controller('localcontentTileController', ['tileState', 'callApi', '$scope', '$rootScope', function (tileState, callApi, $scope, $rootScope) {
    //make sure the inserted tile is not a template
    if (!$scope.tilereadonly && callApi.state.tiles[$scope.tileindex].template){
        callApi.state.tiles[$scope.tileindex] = callApi.state.tiles[$scope.tileindex].template;
        $scope.tile = callApi.state.tiles[$scope.tileindex];
    }
    
    this.doQuery = function(){
        callApi.searchStacks();
    };
    
    this.tileEdit = function ($event) {
        tileState.tileEdit($event, $scope.tile, $scope.tileindex);
    };
    
    this.tileClick = function ($event) {
       if (!$scope.tiletemplate){
           if ($scope.tilereadonly && !is_app){
                 tileState.alerts.add(tileState.translateStandard('view_in_edit_modus'), 'warning');
                return true;
            }
            $(window).scrollTop(0);
            tileState.toggleSelect($event, 'off');
            tileState.setTile($scope.tile, "full", $scope.tileindex);
       }
    };
    
    $rootScope.$on('LTBApp.stack: close active tile', function(){
        if ($scope.tile.tile_id === tileState.tileEdit_id) {
            tileState.tileEdit();
        }
    });
    
    this.tileTemplateUrl = function(){
      return tileState.getTileUrl('localcontent');
    };
}])

.controller('localcontentFullController', ['tileState', 'trust', 'callApi', '$scope', '$rootScope',
    function(tileState, trust, callApi, $scope, $rootScope){
    this.edit_stack = tileState.edit_stack;  
    this.tile = tileState.selectedTile;
    this.entity_src = '';
    this.entities = [];
    var _this = this;
    this.htmlSafe;
    this.def_thumbnail = path_root+ 'assets/resources/videoPlaceholder.jpg';

    
    this.init = function(){
        _this.loading = callApi.loading_queue;
        if (!$scope.tilereadonly) {
            var search_fields = {};
            if (_this.tile.settings.search_type == 'tags'){
                search_fields['tags'] = _this.tile.settings.search_tags;
            } else {
                search_fields['terms'] = _this.tile.settings.search_terms;
            }
            var entity_type = _this.tile.settings.entity_type;
            callApi.searchEntities(search_fields, entity_type, function(data){
                if (data._embedded){
                    _this.entities = data._embedded.entities;
                }
                if (! _this.entities.length){
                    $("#no_results").text('No entities found with this search');// translate
                }
            });
        }
    };
    
    $rootScope.$on('tilestate:setTileOnReload', function (){
        _this.tile = tileState.selectedTile;
        _this.init();
    }); 
    
    this.deriveAchsoId = function(entity){
        var parts = entity.link.split('/');
        return parts.pop();
    };
    
    this.getAchsoVideoPlayerUrl = function(entity){
        var protocol = (is_app)?'http:':'';
        return protocol+"//achrails.herokuapp.com/achrails/en/videos/"+
          this.deriveAchsoId(entity) +
          "/player";
    };
    
    this.setThumbnailUrl = function(entity){
        if (entity.type == 'video'){
            if (entity.link.indexOf("achrails") >= 0){
                var parts = entity.link.split('/');
                var id = parts.pop();
                var protocol = (is_app)?'http:':'';
                entity.image_url = protocol+"//achso.aalto.fi/storage/thumbnails/"+
                    this.deriveAchsoId(entity) +
                    ".jpg";
            } else {
                entity.image_url = this.def_thumbnail;
            }
        } else {
            entity.image_url = '';;
        }
        return entity;
    };
    
    this.play = function(entity){
        if (entity.type === 'video'){
            deblog(entity);
            if (entity.link.indexOf("achrails") !== false){// translate "Select an item to play"
                var newHtml = '<iframe id="player" src="'+this.getAchsoVideoPlayerUrl(entity)+'" frameBorder="0" style="width:100%; height:100%;" allowfullscreen >\n\
                    Select an item to play\n\
                </iframe>';
                this.htmlSafe = trust.html(newHtml);
                
            } else {
                //alert('Other video');
            }
        } else {
            //alert ('We have not fully implemented playing other types of content. This is upcoming');
        }
        
        tileState.subscreen = 1;
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

.controller('localcontentMenuController', ['tileState', '$rootScope', function(tileState, $rootScope){
    this.selectedTile = tileState.selectedTile;
    var _this = this;
    
    $rootScope.$on('tilestate:setTile', function (){
        _this.selectedTile = tileState.selectedTile;
    });
    
    this.entities = [
        { 
            type: 'video', 
            label: 'Video'
        },
        { 
            type: 'image', 
            label: 'Image'
        },
        { 
            type: 'file', 
            label: 'File'
        }
    ];
    

    this.tileDelete = function (){
        tileState.tileDelete();        
    };
}]);
