var dependencies = [
    'backbone',
    'hbs!app/applets/ssoLogon/main',
    'api/SessionStorage',
    'main/ADK'
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(Backbone, mainTemplate, sessionStorage, ADK) {
    'use strict';

    var createFullViewApplet = function () {
        var applet = {
            id: 'ssoLogon',
            hasCSS: false,
            getRootView: function () {
                return fullLayoutView;
            }
        };
        return applet;
    };

    var ccowSession = sessionStorage.getModel('ccow');

    var fullLayoutView = Backbone.Marionette.LayoutView.extend({
        onDomRefresh: function () {
            if (ccowSession && ccowSession.get('status') === 'Connected') {
                $('span#banner').html('Patient Syncing In Progress...');
            } else if (ccowSession && ccowSession.get('status') === 'NotConnected') {
                $('span#banner').html('Auto SignIn Failed...Redirecting to Login Page');
                ADK.Navigation.navigate('logon-screen');

            } //else {
            //ADK.Navigation.navigate('logon-screen');
            //}

        },
        template: mainTemplate
    });


    return createFullViewApplet();
}