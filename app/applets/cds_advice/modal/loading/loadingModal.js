var dependencies = [
    'main/ADK',
    'backbone',
    'marionette',
    'underscore',
    'hbs!app/applets/cds_advice/modal/loading/loadingTpl'
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(ADK, Backbone, Marionette, _, Tpl) {
    'use strict';

    function createView(model) {
        var opts = {
            model: model
        };
        var View = Backbone.Marionette.ItemView.extend({
            template: Tpl
        });
        return new View(opts);
    }

    return {
        /**
         * Shows the Loading view's modal.
         *
         * @param {BackboneJS.Model} model The model object created for the list item.
         * @param {string} title The title of the modal.
         */
        show: function (model, title) {
            var view = createView(model);
            var modalOptions = {
                title: title
            };
            ADK.showModal(view, modalOptions);
        }
    };
}