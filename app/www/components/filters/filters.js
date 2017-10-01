'use strict';

angular.module('LTBApp')
.filter('cut', function () {
    return function (value, wordwise, max, tail) {
        if (!value) return '';

        max = parseInt(max, 10);
        if (!max) return value;
        if (value.length <= max) return value;

        value = value.substr(0, max);
        if (wordwise) {
            var lastspace = value.lastIndexOf(' ');
            if (lastspace !== -1) {
                value = value.substr(0, lastspace);
            }
        }

        return value + (tail || ' …');
    };
})
.filter('relevantAlerts', function(){
   return function(alerts){
       var result = [];
        for(var i = 0, len = alerts.length; i < len; i++) {
            if (alerts[i].show_times > 0) {
                result.push(alerts[i]);
            }
        }
        return result;
   };        
      
});