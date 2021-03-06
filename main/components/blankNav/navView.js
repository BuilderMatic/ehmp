var dependencies = [
    "backbone",
    "marionette",
    "underscore",
    "hbs!main/components/blankNav/navTemplate"
];

'use strict';

define(dependencies, onResolveDependencies);

function onResolveDependencies(Backbone, Marionette, _, navTemplate) {
    return Backbone.Marionette.ItemView.extend({
        template: navTemplate,
        className: 'col-md-12 navbar-fixed-top'
    });
};