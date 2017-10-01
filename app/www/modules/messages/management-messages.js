'use strict';

angular.module('LTBApp.managementmessgs', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/managementMessages/:stackid', {
        templateUrl: path_root + 'modules/messages/management-messages.html',
        controller: 'ManagementMssgsCtrl',
        controllerAs: 'MngMessgCtrl'
    });
}])
.controller('ManagementMssgsCtrl', ["callApi", "tileState", "gettextCatalog", "$scope", 
    "$http", "$filter", "$routeParams", "$location","modalService","alerts","$rootScope",
    function(callApi, tileState, gettextCatalog, $scope, 
    $http, $filter, $routeParams, $location, modalService, alerts, $rootScope) {
    
    var _this = this;
    var stackid = $routeParams.stackid  || 0;
    this.message = false;
	this.message_index = false;
    deblog('ManagementMssgsCtrl', stackid);
 
    callApi.getStack(stackid);
    //Give me all messages including past and future messages.
    callApi.getStackMessages(stackid, false, 'all', true);
    $scope.message_start_opened = false;
    $scope.message_end_opened = false;
    
    this.cancelMessage = function(){
        deblog(' in de cancelMessage');
        _this.message = false;
		_this.message_index = false;
    };
    
    this.deleteMessage = function () {
        if (this.message) {
            var modalOptions = {
                closeButtonText: gettextCatalog.getString('Cancel'),
                actionButtonText: gettextCatalog.getString('Delete'),
                headerText: gettextCatalog.getString('Confirm delete'),
                bodyText: gettextCatalog.getString('Are you sure you want to delete this message?')
            };
            modalService.confirmModal(
                modalOptions,
                function () {
                    callApi.deleteMessage(
                        _this.message,
                        function(data){
                            console.log('Your message has been successfully deleted', data);
                            alerts.add(gettextCatalog.getString('Your message has been successfully deleted'), 'success', true, 'deleteMessage');
                            _this.cancelMessage();
                        },
                        function(result){
                           console.log('Your message could not be removed', result);
                           alerts.add(gettextCatalog.getString('Your message could not be removed'), 'danger');
                        }
                    );
                }
            );
        }
    };
    
    this.selectMessage = function (message, index) {
        this.message = angular.copy(message);
		this.message_index = index;
        if (message.start && moment(message.start).valueOf() > 0){
            this.message.start = moment.utc(message.start).local().toDate();
        } else {
            this.message.start = moment().toDate();
        }
        if (message.end && moment(message.end).valueOf() > 0){
            this.message.end = moment.utc(message.end).local().toDate();
        } else {
            this.message.end = null;
        }
    };
    
    this.MessageValidation = function(){
        if (!this.message) return false;
        if (!this.message.subject) return false;
        if (!this.message.content) return false;
        return true;
    };
    
    this.saveMessage = function(donext) {
        if (this.message) {
			if (this.message_index !== false){
				this.state.messages['stack'][this.message_index] = this.message;
			}
            var success_fun = (donext) ? function() {_this.newMessage();} : function () { _this.cancelMessage();};
            callApi.saveMessage(this.message, success_fun);
        }
    };
    
    this.newMessage = function() {
        var today = moment().toDate();
        var newMess = {
			mess_type: "stack",
			subject: "",
			content: "",
			start: today,
			end: "",
			entity_code: stackid
        };
        this.message = newMess;
		this.message_index = false;
    };
    
    this.state = callApi.state;
    $rootScope.$on('ltbapi:messages-loaded', function(){
        _this.state = callApi.state;
    });

    this.closeMessageEditor= function(){
        $location.path("/viewStack/"+this.state.stackid);
    };
    
    this.setOpenCondition = function($event, field) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope[field] = true;
    };
}]);