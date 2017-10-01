'use strict';

var tileTypes = angular.module('LTBApp.tileTypes', [])

.directive("tile", ['tileState', '$compile', "callApi", "alerts", 
    function(tileState, $compile, callApi, alerts) {
        
    return {
        restrict: "E",
        
        scope: {
            tiletype: '=',
            tile: '=',
            tileindex: '=',
            tilereadonly: '=',
            tiletemplate: '=',
            size: '=' //can be handy to know if there is space to display
        },
        link: function(scope, element, attrs){
            if (scope.tiletype){
                //If it is a known tyletype for this Tilestore or we are viewing a stack in 
                //the tilestore (not the app) we can show the tile to be able to delete it
                var existing_tile_type = tileState.tileTypeExists(scope.tiletype);
                //If the tile is new, it has no tile id yet
                if (!scope.tile.tile_id && !scope.tile.template){
                    scope.tile.tile_id = tileState.randomUuid();
                } 
                if (existing_tile_type || !is_app){
                    if (!existing_tile_type  && ! is_app) {
                        //Let the tile appear as a non-existing tile that can be removed or so
                        scope.original_tiletype = scope.tiletype;
                        //TODO: translate this
                        var msg = "The tile type '"+scope.original_tiletype+ 
                                "' is unknow (found: <i>"+scope.tile.name+ "</i>).";
                        alerts.add("There are some tiletypes in this stack that cannot be "+
                                "displayed well in this Tilestore version.", 'warning', true,
                                'tile_render');
                        //all found erroneous tiles will be reported use 4th arg with tile title
                        //which will very likely be unique in one screen
                        alerts.add(msg, 'warning', true, scope.tile.name);
                        scope.tiletype = 'default';
                        scope.valid_tiletype = false;
                    } else {
                        scope.valid_tiletype = true;
                    }
										
                    element.html('<div><ng-include src="TileCtrl.tileTemplateUrl()"/></div>').show();
                    var div = element.find('div');
                    div.attr('ng-controller', scope.tiletype + 'TileController as TileCtrl');
                    $compile(element.contents())(scope);
                }
            }
        }
    };
}])

.service('tileState', ['callApi', 'modalService', 'gettextCatalog', '$rootScope',
    '$filter', 'sharedTexts', 'alerts',
    function(callApi, modalService, gettextCatalog, $rootScope, $filter, sharedTexts, 
    alerts){
    var _this = this;
    
    this.init = function(){
        this.templates = [];
        this.selectedTile = {};
        this.fullscreen = false;
        this.subscreen = 0;
        this.forceTileClose = false;
        this.edit = false;
        this.tileindex = null;
        this.tileEdit_id = null;
        this.edit_stack = false;
        this.controllerName = '';
        this.inapp = in_app;//document.URL.indexOf( 'http://' ) === -1 && document.URL.indexOf( 'https://' ) === -1;

        //For convenience we export these services to all the tile types
        this.gettextCatalog = gettextCatalog;
        this.sharedTexts = sharedTexts;
        this.alerts = alerts;
    };

    //Copied from function generateUIDNotMoreThan1million From: 
    //http://stackoverflow.com/questions/6248666/how-to-generate-short-uid-like-ax4j9z-in-js
    this.randomUuid = function () {
        return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).slice(-4);
    };
    
    this.tileTypeExists = function(tiletype){
        if (this.templates){
            return $filter('filter')(this.templates, {type:tiletype}).length;
        } else {
            return false;
        }
    };
    
    this.tileTypeName = function(tiletype){
        if (!tiletype){
            tiletype = this.selectedTile.type;
        }
            
        if (this.tileTypeExists(tiletype)){
            return gettextCatalog.getString($filter('filter')(this.templates, {type:tiletype})[0].name);
        } else {
            return '';
        }
    };
    
    this.tileEdit = function ($event, tile, tileindex) {
        if (tile && this.tileEdit_id !== tile.tile_id){//this.toggleSelect($event)) {
            this.setTile();
            this.tileEdit_id = false;
            this.setTile(tile, 'edit', tileindex);
            this.tileEdit_id = tile.tile_id;
        } else {
            this.setTile();
            this.tileEdit_id = false;
        }
    };
    
    this.tileDelete = function(additional_message, index){
        var message = additional_message ? gettextCatalog.getString(additional_message)+ '. ' : '';
        var modalOptions = {
            closeButtonText: gettextCatalog.getString('Cancel'),
            actionButtonText: gettextCatalog.getString('Delete'),
            headerText: gettextCatalog.getString('Confirm delete'),
            bodyText: message + gettextCatalog.getString('Are you sure you want to delete this tile?')
        };
        modalService.confirmModal(
            modalOptions,
            function () {
                if(!index){
                    index = _this.tileindex;
                }
                callApi.deleteTile(index);
                _this.setTile();
            }            
        );
    };
    
    this.setTile = function(tile, mode, index, subscreen, isreloading){
        this.selectedTile = tile || {};
        if (this.selectedTile.settings && this.selectedTile.settings.htmlPreview){
			delete this.selectedTile.settings.htmlPreview;
		}
        this.selectedSubScreen = subscreen || 0;
        mode = mode || 'full';
        index = index || null;
        if (!tile){
            this.fullscreen = false;
            this.forceTileClose = false;
            this.subscreen = this.selectedSubScreen;
			this.edit = false;
            this.tileindex = null;
        } else if (mode == 'full'){
            this.fullscreen = true;
            this.subscreen = this.selectedSubScreen;
           // this.edit = false;
            this.tileindex = index;            
        } else if (mode == 'edit'){
            this.fullscreen = false;
            this.subscreen = this.selectedSubScreen;
            this.edit = true;
            this.tileindex = index;
            //Just an idea this.screens = callApi.state.screens;
        } else {
            this.fullscreen = false;
            this.subscreen = this.selectedSubScreen;
        }
        if (!isreloading){
            $rootScope.$broadcast('tilestate:setTile');
        } else {
            $rootScope.$broadcast('tilestate:setTileOnReload');	
		}
    };
    
    this.goBack = function(){
        if (this.subscreen > 0 && !this.forceTileClose){
            this.subscreen--;
        } else {
            this.setTile();
        }
    };
    
    this.getTileUrl = function(tile_type){
        return path_root +'components/tile-types/' + tile_type + '/tile.html';
    };
    
    this.getTile = function(){
        return this.selectedTile;
    };
    
    this.getProp = function(prop){
        return this.selectedTile[prop] || '';
    };
    
    this.addTemplate = function(template){
        this.templates.push(template);
    };
    
    this.getTemplates = function(){
        var templates = [];
        var templates_nr = this.templates.length;
        var template = null;
        for(var i = 0; i < templates_nr; i++){
            template = this.templates[i];
            
            template.name = gettextCatalog.getString(this.templates[i].name);
            template.description = gettextCatalog.getString(this.templates[i].description);
            template.template.name = gettextCatalog.getString(this.templates[i].template.name);
            
            templates.push(template);
        }
        return templates;
    };
    
    this.goHome = function () {
        callApi.clearHistory();
        callApi.getTiles();
    };
    
    this.toggleSelect = function($event, select){
        var obj = $($event.target).closest(".tile");
        select = select || null;
        
        if (select === 'off'){
            obj.removeClass('selected');
            //unselected
            return false;
        } else if (select === 'on'){
            $(".tile.selected").removeClass('selected');
            $($event.target).closest(".tile").addClass('selected');
            //selected
            return true;
        } else if (obj.hasClass('selected')) {
            obj.removeClass('selected');
            //unselected
            return false;
        } else {
            $(".tile.selected").removeClass('selected');
            $($event.target).closest(".tile").addClass('selected');
            
            //selected
            return true;
        }
    };
    
    this.translateStandard = function(key, args){
      return args ? sharedTexts.getStringWithArgs(key, args) : sharedTexts.getString(key);  
    };
    
    this.init();
}]) 

.directive("tileFull", function(){
    return {
        restrict: "E",
        template: '<ng-include src="tileTCtrl.tileTypeTemplateUrl(\'full\')"/>',
        controller: 'tileTypeController',
        controllerAs: 'tileTCtrl'
    };
})

.directive("tileProp", function(){
    return {
        restrict: "E",
        template: '<ng-include src="tileTCtrl.tileTypeTemplateUrl(\'prop\')"/>',
        controller: 'tileTypeController',
        controllerAs: 'tileTCtrl'
    };
})

.directive("tileSettings", function(){
    return {
        restrict: "E",
        template: '<ng-include src="tileTCtrl.tileTypeTemplateUrl(\'settings\')" />',
        controller: 'tileTypeController',
        controllerAs: 'tileTCtrl'
    };
})

.controller('tileTypeController', ['tileState', '$scope', '$rootScope', 'gettext', 'gettextCatalog' , function(tileState, $scope, $rootScope, gettext, gettextCatalog){
    var _this = this;
    this.init = function() {
        this.coloursAvailable = [
            {name: gettext("black"), value: "black"}, 
            {name: gettext("blue"), value: "blue"}, 
            {name: gettext("green"), value: "green"}, 
            {name: gettext("purple"), value: "purple"},
            {name: gettext("red"), value: "red"},
            {name: gettext("orange"), value: "orange"}
        ];
        this.sizesAvailable = [
            {name: gettext("normal"), value: "normal"},
            {name: gettext("double"), value: "double"},
            {name: gettext("double-down"), value: "double-down"}
        ];

        //For now this is deprecated
        this.iconsAvailable = [
            {name: "No Icon", value: ""},
            {name: "Content Icon", value: "file-text-o"},
            {name: "Application Icon", value: "android"},
            {name: "Navigation Icon", value: "compass"},
            {name: "Rss Icon", value: "rss"},
            {name: "Embedding Icon", value: "cogs"},
            {name: "Listings", value: "list"}
        ];
        this.selectedTile = tileState.selectedTile;

        $rootScope.$on('tilestate:setTile', function (){
            _this.selectedTile = tileState.selectedTile;
        });
    };
    
    this.translate = function(orig_items){
        var items = [];
        var item = false;
        for (var i = 0; i < orig_items.length; i++){
            item = orig_items[i];
            
            item.name = gettextCatalog.getString(orig_items[i].name);
            
            items.push(item);
        }
        return items;
    };
  
    this.getColours = function(){
        return this.translate(this.coloursAvailable);
    };
  
    this.getSizes = function(){
        return this.translate(this.sizesAvailable);
    };
  
    this.tileTypeTemplateUrl = function(what) {
        if (this.selectedTile.type){
            if (what === 'prop'){
                //Tile properties depend only on the TileType controller which is the same for
                //all tile types so we do not have to have a separate identical file for every 
                //tile type
                return path_root + 'components/tile-types/' +  '/tile-properties.html';
            } else if (what === 'settings'){
                return path_root + 'components/tile-types/' + this.selectedTile.type + '/settings.html';
            } else if (what === 'full'){
                if (tileState.fullscreen){
                    return path_root + 'components/tile-types/' + this.selectedTile.type + '/full.html';
                } else {
                    return '';
                }
            }
        }
    };
    this.init();
}]);
