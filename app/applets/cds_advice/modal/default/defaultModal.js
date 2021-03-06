var dependencies = [
    'main/ADK',
    'backbone',
    'marionette',
    'underscore',
    'hbs!app/applets/cds_advice/modal/default/defaultTpl'
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(ADK, Backbone, Marionette, _, modalTemplate) {
    'use strict';

    function createView(model) {
        var opts = {
            model: model
        };
        var View = Backbone.Marionette.ItemView.extend({
            template: modalTemplate
        });
        return new View(opts);
    }

    return {
        /**
         * Shows the Default details modal.
         *
         * @param {BackboneJS.Model} model The model object created for the list item.
         */
        show: function (model) {
            var view = createView(model);
            var modalOptions = {
                title: 'CDS Advice'
            };
            ADK.showModal(view, modalOptions);
        }
    };
}