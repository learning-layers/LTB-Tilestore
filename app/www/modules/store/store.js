'use strict';

angular.module('LTBApp.tileStore', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/store', {
    templateUrl:path_root +  'modules/store/store.html',
    controller: 'SearchController',
    controllerAs: 'searchCtrl'
  });
}])

.controller('SearchController',['$scope', '$location', 'callApi', '$rootScope', 
    function($scope, $location, callApi, $rootScope){
    this.previous_text = '';
    this.loading = false;
    this.search_done = false;
    
    var _this = this;
    this.initStacks = function () {
        if (callApi.state.allstacks && callApi.state.allstacks.length > 0) {
            this.results = callApi.state.allstacks;
        } else {
            callApi.getStacks();
        }
    };
    
    this.init = function(){
        _this.loading = callApi.loading_queue;
        _this.initStacks();
    };

    this.setSearchText = function(text_to_search){
        deblog('gaat searchen');
        var same_is_ok = true;
        if (text_to_search && (same_is_ok || text_to_search !== this.previous_text)){
                deblog('gaat echt searchen');
            this.previous_text = text_to_search;
            this.results = [];
            this.search_done = false;
            callApi.searchStacks({terms: text_to_search}, function (data){
                _this.results = data._embedded.stacks;
                _this.search_done = true;
            });
        } else if (! text_to_search) {
                deblog('neemt allstacks', callApi.state.allstacks);
            _this.results = callApi.state.allstacks;
        } else {
            deblog('same results ??');
            //Nothing needs to be done. Same results
        }
        
    };
    
    this.openDetailsScope= function(stack_code){
       $location.path("/viewStack/"+stack_code);
    };
	
    this.qrUrl = function(stack){
		return callApi.qrUrl(stack);
    };
    
    //For the initialisation upon first load of the search page
    $rootScope.$on('ltbapi:allstacks-loaded', function(){
        _this.results = callApi.state.allstacks;
    });
    
    this.init();
}]);
