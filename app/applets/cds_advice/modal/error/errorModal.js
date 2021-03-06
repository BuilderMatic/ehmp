var dependencies = [
    'main/ADK',
    'backbone',
    'marionette',
    'underscore',
    'hbs!app/applets/cds_advice/modal/error/errorTpl'
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
         * Shows the Error modal.
         *
         * @param {string} adviceTitle The title of the advice that failed to get details.
         */
        show: function (adviceTitle) {
            var model = new Backbone.Model({
                adviceTitle: adviceTitle
            });
            var view = createView(model);
            var modalOptions = {
                title: 'Error'
            };
            ADK.showModal(view, modalOptions);
        }
    };
}