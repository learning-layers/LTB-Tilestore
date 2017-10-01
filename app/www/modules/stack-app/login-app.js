'use strict';

angular.module('LTBApp.login', ['ngRoute'])

.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/login', {
        templateUrl: path_root + 'modules/stack-app/login-app.html',
        controller: 'loginAppController',
        controllerAs: 'loginCtrl'
    });
}])

.controller('loginAppController', ['callApi', 'alerts', 'AccessToken', function (callApi, alerts, AccessToken) {
    //@todo login...
    this.loginWindow = false;
    this.apisettings = callApi.apisettings;
    this.login = function (force) {
        if(force === false){
            alerts.login(false);
        }else{
			
			if (in_app){ // added because of use of cordova below
			
				var url = AccessToken.getAuthUrl();
				//TODO: check whether we want AccessToken.initProfile()...
				var loginWindow = cordova.InAppBrowser.open(url, '_blank', 'location=no');

				if (loginWindow != null ) {
					loginWindow.addEventListener('loadstart', function (e) {
						var url = e.url;
						var authEnc64 = url.split("auth_enc=")[1];

						if (authEnc64 && authEnc64 !== "") {
							loginWindow.close();
							//Set token, this generates oauth:login event
							AccessToken.setTokenFromStruct(authEnc64, true);
						} else {
							if (url.indexOf('access_token')!== false) {
								AccessToken.setTokenFromString(url);
							}
						}
						//update favourites
						callApi.getFavourites();
						//close login screen
						alerts.login(false);
					});
				}
			}else{
				
				alerts.add('This will only open on your mobile device', 'warning');
				
			}
        }
    };  
    
    this.loadDefaultStack = function() {
        alerts.login(false);
        callApi.getStack(callApi.apisettings.default_stack);
    };  
	

}])
    
.directive("appLogin", function() {
    return {
      restrict: "E",
      controller: 'loginAppController',
      controllerAs: 'loginCtrl',
      templateUrl: path_root + "modules/stack-app/popup-login.html"
    };
});
    

