'use strict';

angular.module('LTBApp.messagesList', ['ngRoute'])
    
// Module configuration
.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/messagesList/:stackid/:filter?', {
        templateUrl: path_root + 'modules/messages/messagesList.html',
        controller: 'MessagesListCtrl',
        controllerAs: 'MessagesCtrl'
    });
}])

// Controller
.controller('MessagesListCtrl', ['alerts', 'callApi', 'gettextCatalog', 'AccessToken',
    '$routeParams', '$location', '$rootScope',
    function (alerts, callApi, gettextCatalog, AccessToken, $routeParams, $location, 
        $rootScope) {
    // binding the model with the view with vm (viewModel)
    var _this = this;
    this.messages = [];
    this.message = false;
    this.message_filter = $routeParams.filter || 'All';
    
    this.message_filters = {
        All: {
            filter: null,
            no_messages: gettextCatalog.getString("No messages found.")
        },
        Read: {
            filter: {read: '1'},
            no_messages: gettextCatalog.getString("No read messages found.")
        },
        Unread: {
            filter: {read: '0'},
            no_messages: gettextCatalog.getString("No new messages found.")
        }
    };
    
    this.init = function(){
        //Get Stack messages
        this.stack_code = $routeParams.stackid;
        this.increase_count = 0;
        //We get messages either for a certain stack or for a specific user
        //We deliver in the state a var messages : {stack: [..], user:[..]}
        if (this.stack_code && ! ($routeParams.filter && callApi.state.messages.stack)){
            if (!AccessToken.get()) {
                alerts.login(true);
            }else{
                deblog(' haalt messages op');
                callApi.getStackMessages(this.stack_code, true, 'all', false);
            }
        } else {
            this.messages = callApi.state.messages;
        }
    };

    this.closeMessagesScreen = function(){
        $location.path('/');
    };

    // Patch REMOTE_API message or insert read entry in table for this user
    this.setServerMessageStatus = function(mess_code, status) {
        callApi.setMessageStatus(mess_code, status, function(){
            $rootScope.$emit('messageList:count_update', status ? -1 : 1);
        });
        
    };

    this.openMessage = function(message) {
        if (message.read !== "1"){
            this.setServerMessageStatus(message.mess_code, 1);
        }
        message.read = "1";
        this.message = message;
    };

    this.closeMessage = function(tab){
        if (tab){
            this.message_filter = tab;
        }
        deblog('wat is na close the message_filter', this.message_filter);
        this.message = false;
    };

    this.toggleReadMessage = function(){
        var status = (this.message.read == "1") ? 0 : 1;
        this.setServerMessageStatus(this.message.mess_code, status);
        this.message.read = status ? "1" : "0";
    };

    //When new messages arrive from api, update the messages of this controller
    $rootScope.$on('ltbapi:messages-loaded', function(){
        console.log('new messages', callApi.state.messages.stack);
        _this.messages = callApi.state.messages;
    });

    this.init();
}])
;
