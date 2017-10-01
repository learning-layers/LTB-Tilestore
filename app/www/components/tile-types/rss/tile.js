'use strict';

tileTypes
.run(['tileState', 'gettext', function(tileState, gettext){
    tileState.addTemplate({
        deprecated: false,
        type: "rss",
        size: "",
        colour: "green",
        name: gettext("RSS"),
        description: gettext("Show RSS Feed"),
        icon: "rss",
        image_url: path_root + 'assets/resources/tile-rss.jpg',
        template: {
            size: "normal",
            colour: "green",
            name: gettext("New RSS"),
            description: "",
            icon: "rss",
            position: 0,
            settings: {
                query: "",
                url: ""
            },
            type: "rss"
          }
        
        }
    );
}])

.controller('rssTileController', ['tileState', 'callApi', '$scope', '$rootScope', '$location',
    function (tileState, callApi, $scope, $rootScope, $location) {
        
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
            tileState.setTile($scope.tile, 'full', $scope.tileindex);
        }
    };
    
    this.tileTemplateUrl = function(){
        return tileState.getTileUrl('rss');
    };
    
    this.readFeed = function(){
        var protocol = ($location.protocol() === 'https')?'https':'http';
        if (! $scope.tile.settings.url){
            return false;
        }
        callApi.jsonp(protocol+'://ajax.googleapis.com/ajax/services/feed/load?v=1.0&callback=JSON_CALLBACK&q='+
          $scope.tile.settings.url,
          function(data){
            if (data.responseData && (data.responseStatus !== 400)){
                $scope.tile.settings.feed = data.responseData.feed;
                $scope.tile.settings.count = $scope.tile.settings.feed.entries.length;
            } else {
                deblog(data.responseDetails);//'Invalid feed', 
                $scope.tile.settings.feed = null;
                $scope.tile.settings.count = 0;
            }
        });
    };
    
    this.init = function(){
        //Make sure the inserted tile is not a template
        if (!$scope.tilereadonly && callApi.state.tiles[$scope.tileindex].template){
            callApi.state.tiles[$scope.tileindex] = callApi.state.tiles[$scope.tileindex].template;
            $scope.tile = callApi.state.tiles[$scope.tileindex];
        }
        
        $rootScope.$on('LTBApp.stack: close active tile', function(){
            if ($scope.tile.tile_id === tileState.tileEdit_id) tileState.tileEdit();
        });
        
        if (!$scope.tilereadonly) this.readFeed();
    };
    
    //Main
    this.init();
    
}])

.controller('rssFullController', ['tileState', '$rootScope',function(tileState,$rootScope){
    var _this = this;
    this.edit_stack = tileState.edit_stack;          
    this.tile = tileState.selectedTile;
    
    $rootScope.$on('tilestate:setTileOnReload', function (){
        _this.tile = tileState.selectedTile;
    }); 
    
    this.tileClose = function () {
       tileState.setTile();
    };
}])

.controller('rssMenuController', ['callApi', 'tileState', '$location', function(callApi, tileState, $location){
        
    this.query = angular.copy(tileState.selectedTile.settings.query);
    
    this.tileDelete = function (){
        tileState.tileDelete();        
    };
    
    this.findFeed = function(){
        var protocol = ($location.protocol() === 'https')?'https':'http';
        callApi.jsonp(protocol+'://ajax.googleapis.com/ajax/services/feed/lookup?v=1.0&callback=JSON_CALLBACK&q='+this.query, function(data){
            if (data.responseStatus === 200){
                tileState.selectedTile.settings = data.responseData;
                callApi.jsonp(protocol+'://ajax.googleapis.com/ajax/services/feed/load?v=1.0&callback=JSON_CALLBACK&q='+tileState.selectedTile.settings.url, function(data){
                    tileState.selectedTile.settings.feed = data.responseData.feed;
                    tileState.selectedTile.settings.count = tileState.selectedTile.settings.feed.entries.length;
                    tileState.selectedTile.name = tileState.selectedTile.settings.feed.title;
                });
            } else {
                //no feed found
            }            
        });
    };
    
}])
;
