'use strict';

tileTypes

.run(['tileState', 'gettext', function(tileState, gettext){
    tileState.addTemplate({
        deprecated: false,
        type: "navigate",
        size: "",
        colour: "red",
        icon: "compass",
        name: gettext("Navigation"),
        description: gettext("Navigate to screen or stack"),
        image_url: path_root + 'assets/resources/tile-navigate.jpg',
        template: {
            size: "normal",
            colour: "red",
            name: gettext("New Navigation"),
            icon: "compass",
            position: 0,
            settings: {
                target: 1,
                target_stackcode: "",
                navicon: ""
            },
            type: "navigate"
        }
        
    }
    );
}])
.controller('navigateTileController', ['tileState', 'callApi', '$scope', '$rootScope', 
    function (tileState, callApi, $scope, $rootScope) {
    //make sure the inserted tile is not a template
    if (!$scope.tilereadonly && callApi.state.tiles[$scope.tileindex].template){
        callApi.state.tiles[$scope.tileindex] = callApi.state.tiles[$scope.tileindex].template;
        $scope.tile = callApi.state.tiles[$scope.tileindex];
    }
    
    this.tileEdit = function ($event) {
        tileState.tileEdit($event, $scope.tile, $scope.tileindex);
    };
        
    this.tileClick = function ($event) {
        if (!$scope.tiletemplate){
            $(window).scrollTop(0);
            if ($scope.tile.settings.target_stackcode && $scope.tile.settings.target_stackcode !== "") {
                if (tileState.controllerName === 'StackAppController'){
                    callApi.getStack($scope.tile.settings.target_stackcode);
                } else {
                    tileState.alerts.add(tileState.gettextCatalog.getString('You can not navigate to another stack in this mode'), 'warning');
                }
            } else {
                tileState.setTile();
                callApi.getTiles($scope.tile.settings.target);
            }
        }
    };
    
    $rootScope.$on('LTBApp.stack: close active tile', function(){
        if ($scope.tile.tile_id === tileState.tileEdit_id) tileState.tileEdit();
    });
    
    this.tileTemplateUrl = function(){
      return tileState.getTileUrl('navigate');
    };
}])

.controller('navigateMenuController', ['callApi', 'tileState', '$rootScope', 'gettext', 
    function(callApi, tileState, $rootScope, gettext){
    var _this = this;
    this.currentStackCode = callApi.state.stackid;
    this.selectedTile = tileState.selectedTile;
    //Originally the target was always the screen. That clarifies the naming
    //If the target_stackcode is set, this will overrule this setting
    this.targetscreen = tileState.selectedTile.settings.target;
    this.NavIconsAvailable = [
        {name: gettext('default'), value: 'arrows'},
        {name: gettext('forward'), value: 'arrow-right'},
        {name: gettext('back'), value: 'arrow-left'},
        {name: gettext('up'), value: 'arrow-up'},
        {name: gettext('down'), value: 'arrow-down'},
        {name: gettext('home'), value: 'home'}
    ];
    
    this.translate = function(orig_items){
        var items = [];
        var item = false;
        for(var i = 0; i < orig_items.length; i++){
            item = orig_items[i];
            
            item.name = tileState.gettextCatalog.getString(orig_items[i].name);
            
            items.push(item);
        }
        return items;
    };
  
    this.getNavIcons = function(){
        return this.translate(this.NavIconsAvailable);
    };
    
    $rootScope.$on('tilestate:setTile', function (){
        _this.selectedTile = tileState.selectedTile;
//        if (!_this.selectedTile.settings.target_type){
//            //deprecated situation: the target_type was not used in old navigation tiles
//            deblog('dit verwwacht ik bij opening', _this.selectedTile.settings);
//            _this.selectedTile.settings.target_type = _this.isStackNavigation() ? 'stack' : 'screen';
//            deblog('dit verwwacht ik bij opening', _this.selectedTile.settings);
//        }
        _this.is_screen_navigation = ! _this.isStackNavigation();//(_this.selectedTile.settings.target_type === 'screen') ;
    });
    
    this.createNewScreen = function (value) {
        if (!value) {
            var aux = this.selectedTile;
            $rootScope.$emit('LTBApp.stack: close active tile');
            callApi.addScreen();
            aux.settings.target = callApi.state.screen.id;
        }
    };
    
    this.tileDelete = function (){
        tileState.tileDelete();        
    };
    
    this.stackTargetChange = function(id){
        //The tile gets the name of the stack it navigates to unless there was already a name
        if (!tileState.selectedTile.name || confirm('Do you want the tile to have the same name as the stack')){ // translate
            tileState.selectedTile.name = $('#'+id).find(":selected").text();
        }
    };
    
    this.isStackNavigation = function(){
        return (this.selectedTile.settings && this.selectedTile.settings.target_stackcode && this.selectedTile.settings.target_stackcode != "");
    };
    
    this.toggleNavigationType = function(){
        this.is_screen_navigation = !this.is_screen_navigation;
        this.selectedTile.settings.target_stackcode = null;
    };
    
    this.is_screen_navigation = ! _this.isStackNavigation();
    this.allStacks = callApi.state.allstacks;
    if (callApi.state.allstacks.length == 0) {
        console.log('stacks were not retrieved in navigation tile or the length was simply zero');
        callApi.getStacks();
    }
    
    $rootScope.$on('ltbapi:allstacks-loaded', function (){
        _this.allStacks = callApi.state.allstacks;
    });
    
}]);
