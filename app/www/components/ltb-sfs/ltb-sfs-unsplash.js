// https://api.unsplash.com/photos/search?query=car,red&page=1&client_id=87d450407f26a37b6f4e77437053b31d701aa168de52f3619217f44c75fe6295

angular.module('LTBApp.sfs.unsplash', [])

.service('sfsServiceUnsplash', ['callApi', '$rootScope', '$http', function(callApi, $rootScope, $http){
    var _this = this;
    this.api_key = callApi.apisettings.unsplash_api_key;
    this.api_search_endpoint = "https://api.unsplash.com/photos/search?";
    this.imageResult = [];
    
    $rootScope.$on('settings:update', function(){
        _this.api_key = callApi.apisettings.unsplash_api_key;
        //_this.searchImages('car');
        console.log('unsplash', _this.api_key, callApi.apisettings);
    });
    
    this.clear = function(){
        this.imageResult = [];
    };
    
    this.searchImages = function(str, page){
        
        if(!page){
            page = 1;
        }
        var request = this.api_search_endpoint + 'query=' + str + '&page=' + page + '&client_id=' + this.api_key;
                
        try {
            $http.get(request, {notoken: true}).then(
                function(result){
                    _this.imageResult = result.data;
                    console.log('searchImages', _this.imageResult);
                }, 
                function(){
                    _this.clear();
                }
            );
        } catch (e) {
            console.log('Get call returned fatal error', e);
            this.clear();
            return false;
        }
    };  
        
}])
;