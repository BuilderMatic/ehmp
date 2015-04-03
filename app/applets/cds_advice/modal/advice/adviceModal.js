var dependencies = [
    'main/ADK',
    'backbone',
    'marionette',
    'underscore',
    'hbs!app/applets/cds_advice/modal/advice/adviceBodyTpl',
    'hbs!app/applets/cds_advice/modal/advice/adviceFooterTpl'
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(ADK, Backbone, Marionette, _, bodyTpl, footerTpl) {
    'use strict';

    function createBodyView(model) {
        var opts = model ? {
            model: model
        } : null;
        var View = Backbone.Marionette.ItemView.extend({
            template: bodyTpl
        });
        return new View(opts);
    }

    function getFooterView(model) {
        var View = Backbone.Marionette.ItemView.extend({
            template: footerTpl
        });
        return View;
    }

    return {
        /**
         * Shows the Advice details modal.
         *
         * @param {BackboneJS.Model} model The model object created for the list item.
         */
        show: function (model) {
            var view = createBodyView(model);
            var footer = getFooterView(model);
            var modalOptions = {
                title: 'Advice',
                footerView: footer
            };
            ADK.showModal(view, modalOptions);
        }
    };
}