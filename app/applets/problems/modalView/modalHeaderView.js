var dependencies = [
    'backbone',
    'marionette',
    'underscore',
    'hbs!app/applets/problems/modalView/headerTemplate',
    "main/ADK"
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(Backbone, Marionette, _, HeaderTemplate, ADK) {
    'use strict';

    //Modal Navigation Item View
    return Backbone.Marionette.ItemView.extend({
        events: {
            'click #ccd-previous, #ccd-next': 'navigateModal'
        },

        navigateModal: function(e) {
            var $target = $(e.currentTarget),
                id = $target.attr('id');

            id === 'ccd-previous' ? this.theView.getPrevModal() : this.theView.getNextModal();
        },

        template: HeaderTemplate

    });

}