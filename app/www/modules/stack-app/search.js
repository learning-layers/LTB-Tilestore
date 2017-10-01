'use strict';

angular.module('LTBApp.search', [])

.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/search', {
        templateUrl: path_root +  'modules/stack-app/search.html',
        controller: 'SearchController',
        controllerAs: 'srchCtrl'
    });

}])

.controller('SearchController', ['callApi', '$location', '$timeout', 'gettextCatalog', 'alerts',
    function (callApi, $location, $timeout, gettextCatalog, alerts) {
        var _this = this;
        this.search_term = null;
        this.init = undefined;
        this.search_option = 'all';
        this.search_results = [];
        this.search_results_total = 0;
        this.search_term_minimum = 2;
        this.search_offset = 0;
        this.search_pagesize = 10;
        this.search_lifo = [];
        this.last_search = '';
        this.no_results = '';
        this.show_info = false;

        this.showSearchInfo = function(show){
            this.show_info = show;
        };
        
        this.searchLater = function(){
            var search_on_terms = this.search_term && this.search_term.length >= this.search_term_minimum;
            //If length is long enough to make it worth searching, put in queue
            if (search_on_terms) {
                this.search_lifo.push({ term: this.search_term
                    //we no longer have separate author search option, author: this.search_author_term
                });
                var fun = this.startSearchOnTimeout.bind(undefined, this.search_term);
                $timeout(fun, 500); //wait half a second after last update
            }
        };
        
        this.startSearchOnTimeout = function(term){
            var last = _this.search_lifo.length -1;
            if ((last >= 0) && (_this.last_search_term !== term) && (term === _this.search_lifo[last].term)){
                _this.last_search_term = term;
                _this.search(false, term);
                _this.search_lifo.splice(0, last + 1);
            }
        };
        
        this.startSearchOnEnter = function($event) {
            if ($event.keyCode === 13) {
                if (callApi.isDefined('cordova')) {
                    //In the preview the cordova module is not available
                    cordova.plugins.Keyboard.close();
                }
                this.search();
            }
        };
        
        this.search = function(append, term) {
            if (append) {
                this.search_offset = this.search_results.length;
            } else {
                this.search_offset = 0;
            }
            if (! term){
                term = this.search_term;
            }
            
            if (term && term.length >= this.search_term_minimum ) {
                var search_fields = {
                    offset: this.search_offset,
                    page_size: this.search_pagesize
                };
                var fld = 'terms';
                switch (this.search_option){
                    case 'tags': fld = 'tags';break;
                    case 'title': fld = 'name';break;
                    case 'author': fld = 'author';break;
                }
                search_fields[fld] = term; 
                this.no_results = '';
                callApi.searchStacks(search_fields, function (data) {
                    if (data._embedded.stacks && data._embedded.stacks.length){
                        _this.no_results = '';
                        
                        if (append) {
                            _this.search_results = _this.search_results.concat(data._embedded.stacks);
                        } else {
                            _this.search_results = data._embedded.stacks
                        }
                    } else {
                        if (!append) {
                            _this.search_results = [];
                        }
                        _this.no_results = append ? gettextCatalog.getString('No additional results found.') : gettextCatalog.getString('No results found.');
                    }
                    _this.search_results_total = data.total_items;
                });
            } else {
                //alerts signature: msg, type, global, key, show_times, dev_only, args
                alerts.add(gettextCatalog.getString(
                    'A minimum length of %s is required for the search string'), 
                    'warning', 0,0,0,0, [this.search_term_minimum]);
                _this.search_results = [];
            }
        };

        this.toggleFavourite = function (stack) {
            if (stack.favourite == 1) {
                stack.favourite = 0;
                callApi.deleteFavouriteStack(stack);
            } else {
                stack.favourite = 1;
                callApi.setFavouriteStack(stack);
            }
        };

        this.selectStack = function (stack) {
            callApi.getStack(stack.stack_code);
            $location.path("/");
        };

    }
])
;

