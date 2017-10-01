'use strict';

tileTypes
.run(['tileState', 'gettext', function(tileState, gettext){
    tileState.addTemplate({
        deprecated: true,
        type: "embed",
        size: "",
        colour: "red",
        name: gettext("Embed"),
        description: gettext("Embed external content"),
        icon: "cogs",
        image_url: path_root + 'assets/resources/tile-embed.png',
        template: {
            name: gettext("New Embed"),
            size: "double",
            colour: "red",
            description: "Embedding an external piece of content",
            icon: "cogs",
            position: 0,
            settings: {thumbnail_url: ""},
            type: "embed"
          }
        
        }
    );
}])

.controller('embedTileController', ['tileState', 'callApi', '$scope', '$rootScope',
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
        //Note that the tile.settings used in the full tile view are coming
        //from embedded site, so tile.name and tile.settings.title are only the 
        //same since we set that as initial value for the name! So when changing the
        //value of the name property, it has no effect on the title shown in the full view.
        if (!$scope.tiletemplate && $scope.tile.settings.url != null){
            $(window).scrollTop(0);
            tileState.toggleSelect($event, 'off');
            tileState.setTile($scope.tile, 'full', $scope.tileindex);
        }
    };
    
    $rootScope.$on('LTBApp.stack: close active tile', function(){
        if ($scope.tile.tile_id === tileState.tileEdit_id) tileState.tileEdit();
    });
    
    this.tileTemplateUrl = function(){
      return tileState.getTileUrl('embed');
    };
    
}])

.controller('embedFullController', ['tileState', 'trust', '$location', 'deviceDetector', '$rootScope',
                                function(tileState, trust, $location, deviceDetector, $rootScope){
    var protocol = ($location.protocol() === 'https')?'https':'http';
    var _this = this;
    this.os = deviceDetector.os;
    this.edit_stack = tileState.edit_stack;        
    this.tile = tileState.selectedTile;
    this.content_class = '';
    this.content_extra = '';
    
    $rootScope.$on('tilestate:setTileOnReload', function (){
        _this.title = tileState.selectedTile;
        _this.init();
    });
    
    this.init = function() {
        if (this.tile.settings.type === 'video' || this.tile.settings.type === 'rich'){
        // Figure out the percent ratio for the padding. This is (height/width) * 100
        var ratio = ((this.tile.settings.height/this.tile.settings.width)*100).toPrecision(4) + '%';
        this.content_class = 'embed-responsive-object';
        this.content_extra = ' style="paddingBottom: '+ratio+';" ';
        }
        deblog('full', this.tile);
        //@todo: remove str.replace fix below when embed api is updated to support 'scheme'
        if (this.tile.settings.html){
            var html = this.tile.settings.html.replace('src=\"//cdn.embed', 'src=\"'+protocol+'://cdn.embed');
            if(protocol === 'https'){
                html = html.replace('src=\"http://cdn.embed', 'src=\"https://cdn.embed');
            }else if(protocol === 'http'){
                html = html.replace('src=\"https://cdn.embed', 'src=\"http://cdn.embed');
            }
            if(this.os === 'ios'){
                html = html.replace('<iframe', '<iframe sandbox="allow-scripts allow-same-origin allow-forms" ');
            }
            this.tile.settings.htmlSafe = trust.html(html);


        }
    };
    
    this.init();
    
    this.tileClose = function($event) {
       tileState.setTile();
    };
}])

.controller('embedMenuController', ['callApi', 'tileState', function(callApi, tileState){
    this.url = angular.copy(tileState.selectedTile.settings.url);
    //Not used TODO this.selectedTile = tileState.selectedTile;

    this.tileDelete = function (){
        tileState.tileDelete();        
    };
    
    var _this = this;
             
    this.findEmbed = function(){        
        var params = {
            width: '',
            height: '',
            scheme: callApi.device.scheme
        };
        callApi.getLinkInformation([this.url], 'embed', params, function(data){
            if (data[0]['type'] == 'error'){
                tileState.alerts.add(data[0]['error_message'], 'danger');
            } else {
                //put embed data in the settings for this embed tile
                tileState.selectedTile.settings = data[0];
                //if there was no url sent along, just take the one the user entered
                tileState.selectedTile.settings.url = tileState.selectedTile.settings.url || _this.url;
                tileState.selectedTile.name = tileState.selectedTile.settings.title;
            }
        });
    };
}])
;
