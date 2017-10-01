'use strict';

angular.module('LTBApp.management', ['ngRoute','ngTagsInput'])
        
.config(['$routeProvider', function($routeProvider) {  
    $routeProvider.when('/viewStack/:stackid', {
        templateUrl:path_root + 'modules/stack/stack_show.html',
        controller:'ManagementStkCtrl',
        controllerAs: 'StackCtrl'
    });
    
    $routeProvider.when('/viewStack/:stackid/:box_details', {
        templateUrl:path_root + 'modules/stack/stack_show.html',
        controller:'ManagementStkCtrl',
        controllerAs: 'StackCtrl'
    });
}])
.controller('ManagementStkCtrl', ['callApi', 'alerts', 'sfsService', 'gettextCatalog', 'AccessToken', '$http', '$scope', 
    "tileState", '$location','$routeParams', "modalService", "$rootScope", "$timeout", "$localStorage",
    function(callApi, alerts, sfsService, gettextCatalog, AccessToken, $http, $scope, tileState, 
        $location, $routeParams, modalService, $rootScope, $timeout, $localStorage) {
    
    var stackId_route = $routeParams.stackid || 0;
    $scope.stackid_route = stackId_route;
    var stackId = stackId_route.split(":")[0];
    var box_details = $routeParams.box_details || '';
    var _this = this;
    this.state = false;
    this.stack_code = stackId;
    this.settings = callApi.settings;
    this.apisettings = callApi.apisettings;
    this.admin = false;
    this.tilereadonly = true;
    this.fullscreen = false;
    tileState.controllerName = 'ManagementStkCtrl';
    this.userIsLogged = false;
    
    this.boxUrl = callApi.getBoxUrl();
    
    this.checkAuth = function(){
        if(AccessToken.get()){
            _this.userIsLogged = true;
        }else{
            _this.userIsLogged = false;
        }
    }
    this.checkAuth();
    $rootScope.$on('oauth:login', _this.checkAuth);
    $rootScope.$on('oauth:authorized', _this.checkAuth);
    $rootScope.$on('oauth:logout', _this.checkAuth);
    
    this.qrUrl = function(stack){
		return callApi.qrUrl(stack);
    };
    
    this.previewStack = function(){
        if (stackId){
            if (callApi.settings.debug && $localStorage.api_uri && callApi.apisettings.api_uri !== $localStorage.api_uri){
                $localStorage.api_uri = callApi.apisettings.api_uri;
                $localStorage.preferred_stack_code = null;
                $localStorage.open_stack = 'last';
            }
            window.open(callApi.getPreviewLocation(stackId), '_blank');
        } else {
            alerts.add(gettextCatalog.getString('This is not a valid Stack code'), 'warning');
        }
    };
    
    this.editStack= function(){
        if (stackId){
            tileState.goHome();
            $location.path("/stack_edit/"+stackId);
        } else {
            alerts.add(gettextCatalog.getString('This is not a valid Stack code'), 'warning');
        }
    };
    
    this.copyStack= function(){
        $location.path("/stack_edit/copy");
    };
    
    this.openManagementMessages= function(){
        $location.path("/managementMessages/"+stackId);
    };
    
    this.deleteStack= function(){
        var modalOptions = {
            closeButtonText: gettextCatalog.getString('Cancel'),
            actionButtonText: gettextCatalog.getString('Delete'),
            headerText: gettextCatalog.getString('Confirm delete'),
            bodyText: gettextCatalog.getString('Are you sure you want to delete this Stack?')
        };
        modalService.confirmModal(
            modalOptions,
            function () {
                callApi.deleteStack(
                    function(data){
                        deblog('In stack show file :Your stack has been successfully deleted', data);
                        alerts.add(gettextCatalog.getString('Your Stack has been successfully deleted'), 'success', true, 'deletestack');
                        //To prevent a warning on possible unsaved changes, we fake that the stack
                        //has not been changed. This should normally never occur.
                        _this.initial_state = null;
                        var timeout = $timeout(function() {
                            $location.path("/my-stacks");
                        });
                    },
                    function(result){
                       deblog('Your stack could not be removed ', result);
                       alerts.add(gettextCatalog.getString('Your Stack could not be removed'), 'danger');

                    }
                );
            }
        );
    };
      
    this.publishStack = function(new_pub, new_acc){
//        
//        deblog('publishStack', pub, access_level);
//        var new_pub = 0;
//        var new_acc = 1;
//        
//        if(pub === true){
//            //publish to 1 if not already published
//            new_pub = (callApi.state.stackfields.public === '0' || callApi.state.stackfields.public === 0)?1:callApi.state.stackfields.public;
//        }else{
//            new_pub = (pub === 1 || pub === 2 ) ? pub : 0;
//        }
//        
        callApi.state.stackfields.public = new_pub;
        if(new_pub === 0){
            callApi.state.stackfields.access_level = 1;
        } else {
            callApi.state.stackfields.access_level = new_acc;
        }
        
        callApi.saveStack(
            function(data){
                var msg = '';
                if (callApi.state.stackfields.public){
                    msg = gettextCatalog.getString('Your Stack is now published');
                } else {
                    msg = gettextCatalog.getString('Your Stack is now private');
                }
                alerts.add(msg, 'success');
            },
            function(result){
               alerts.add(gettextCatalog.getString('Your Stack could not be changed') + ': ' + result.detail,
                'danger');
            }
        );
    };

    this.toggleFavourite = function(){
        deblog('in toggleFavourite', this.state, this.state.stackfields);
        if (this.state.stackfields.favourite == "1"){
            callApi.deleteFavouriteStack(callApi.state.stackfields);
        } else {
            callApi.setFavouriteStack(callApi.state.stackfields);
        }
    };
    
    this.sortableOptions = {
        //hack: allow only sorting of tile items without class tile
        items: "tile:not(.tile)"
    };
       
    this.tileStyle = function(tile){
        return sfsService.tileStyle(tile);
    };
    
    /*
     * Navigation between stacks is by means of a url that has the form:
     * tilestore_url/viewStack/:Stack_Id. If we add to that a box_details (encoded)
     * string, we could first switch to that box before trying to open that stack. If
     * the url was retrieved via a QR scan, but directly from the phone, we arrive here too
     * Of course the box is then the standard box for that tilestore and no switch is necessary.
     * But it is handy to have such a switch for testing and also if we happen to decide
     * that the tilestore can show union of stacks from an owner over all the relevant boxes.
     */
    this.main = function(){
        var same_box = true;
        if (box_details){
            var box = callApi.getBoxDescription(box_details);
            var current_box_id = callApi.getCurrentBoxId();
            if (box.box_id !== current_box_id){
                //If the stack comes from a different box, then switch to that box
                same_box = false;
                $rootScope.$on('ltbapi:getSettings', function(){
                    callApi.getStack(stackId);
                });
                callApi.switchBox(box);
            }
        }
        if (same_box) {
            if (stackId == 0){
                alerts.add(gettextCatalog.getString('This is not a valid Stack'), 'warning');
            } else {
                //When the stack is just created the state is not fully filled with for example 
                //owner data. retrieve stored stack first.
                if (!callApi.state.stack || !callApi.state.owner_name || callApi.state.stackid !== stackId){
                    callApi.getStack(stackId);
                } else {
                    _this.state = callApi.state;
                }
            }
        }   

        $rootScope.$on('ltbapi:stack open', function() {
            _this.state = callApi.state;
        });
    
    };
    this.main();
}]);
