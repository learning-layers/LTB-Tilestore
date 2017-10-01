'use strict';

tileTypes

.run(['tileState', 'gettext', function(tileState, gettext){
    tileState.addTemplate({
        deprecated: false,
        type: "app",
        size: "",
        colour: "black",
        icon: "android",
        name: gettext("App link"),
        description: gettext("Link to a mobile app"),
        image_url: path_root + 'assets/resources/tile-app.png',
        template: {
            size: "normal",
            colour: "black",
            name: gettext("New App"),
            icon: "android",
            position: 0,
            settings: {thumbnail_url: ""},
            type: "app"
        }
    });
}])
.controller('appTileController', ['tileState', 'callApi', '$scope', '$rootScope',
    'deviceDetector', 
    function (tileState, callApi, $scope, $rootScope, deviceDetector) {
   
    this.os = deviceDetector.os;
    this.device = deviceDetector.device;
    
    this.tileEdit = function ($event) {
        tileState.tileEdit($event, $scope.tile, $scope.tileindex);
    };
    
    this.tileTemplateUrl = function(){
      return tileState.getTileUrl('app');
    };
    
    this.openApp = function () {
        //Opening an app should not load the tile. Was: tileState.selectedTile = $scope.tile;
        tileState.selectedTile = $scope.tile;
        if (tileState.selectedTile.template){
            return false;
        }
        if (in_app){
            if (this.os === 'ios') {
                if (tileState.selectedTile.settings.urlScheme === '') {
                    if(tileState.selectedTile.settings.appleid){
                        tileState.alerts.add(tileState.gettextCatalog.getString('This application cannot be directly opened from LTB'), 'warning');
                        window.open('itms://itunes.apple.com/app/id'+ tileState.selectedTile.settings.appleid, '_system');
                    }else{
                        tileState.alerts.add(tileState.gettextCatalog.getString('This application is not available for iOS'), 'warning');
                    }
                } else {
                    var sApp = startApp.set(tileState.selectedTile.settings.urlScheme+"://");
                    sApp.go(
                        function (message) { 
                            /* success */
                        }, function (error) {
                            /* error */
                            if(tileState.selectedTile.settings.appleid){
                                window.open('itms://itunes.apple.com/app/id'+ tileState.selectedTile.settings.appleid, '_system');
                            }
                            alerts.add(error, 'warning');
                        }
                    );
                }
            } else if (this.os === 'android' || this.os === 'linux') {//this.os is mutilated by config.xml
                if (!tileState.edit_stack){
                    if (tileState.selectedTile.settings.package === '') {
                        tileState.alerts.add(tileState.gettextCatalog.getString('This application is not available for Android'), 'warning');
                    } else {
                        var sApp = startApp.set({"package": tileState.selectedTile.settings.package});
                        sApp.start(
                            function () { 
                                /* success */
                            }, function (error) { 
                                /* error */
//TODO test why some apps don't open
//                              tileState.alerts.add('app error'+error, 'warning');
                                window.open('https://play.google.com/store/apps/details?id='+ tileState.selectedTile.settings.package, '_system');
                            }
                        );
                    }
                } else {
                    tileState.alerts.add(tileState.gettextCatalog.getString('This will only open on your mobile device'), 'warning');
                }
            }
        } else {
            tileState.alerts.add(tileState.gettextCatalog.getString('This will only open on your mobile device'), 'warning');
        }
    };
    
    this.init = function(){
        //make sure the inserted tile is not a template
        if (!$scope.tilereadonly && callApi.state.tiles[$scope.tileindex].template){
            callApi.state.tiles[$scope.tileindex] = callApi.state.tiles[$scope.tileindex].template;
            $scope.tile = callApi.state.tiles[$scope.tileindex];
        }
        $rootScope.$on('LTBApp.stack: close active tile', function(){
            if ($scope.tile.tile_id === tileState.tileEdit_id) tileState.tileEdit();
        });
    };
    
    this.init();
}])

.controller('appMenuController', ['$http', 'callApi', 'tileState', '$scope', function($http, callApi, tileState, $scope){
    $scope.appsAvailable = [];
    this.init = function(){
        this.loading = callApi.loading_queue;
        callApi.getAppsAvailable(
            function(data) {
                deblog('getting the apps data ', data);
                $scope.appsAvailable = data;
            }
        );
    };    

    this.selectApp = function () {  
        tileState.selectedTile.name = tileState.selectedTile.settings.name;
    };

    this.tileDelete = function (){
        tileState.tileDelete();        
    };
    
    this.init();
}]);
