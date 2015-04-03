var dependencies = [
    "backbone",
    "marionette",
    "hbs!app/applets/patient_search/templates/mySite/clinics_wards/singleSearchResultTemplate"
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(Backbone, Marionette, SingleSearchResultTemplate) {

    var ENTER_KEY = 13;
    var SPACE_KEY = 32;

    var PatientSearchResultView = Backbone.Marionette.ItemView.extend({
        tagName: "a",
        className: "list-group-item row-layout simple",
        template: SingleSearchResultTemplate,
        attributes: {
            tabIndex: "0",
            onclick: "return false",
            href: ""
        },
        events: {
            "click": "selectPatient",
            "keyup": "selectPatient"
        },
        initialize: function(options) {
            this.searchView = options.searchView;
            this.locationCollectionView = options.locationCollectionView;
            this.searchApplet = options.searchApplet;
            this.model.set('locationType', options.locationType.substr(0, options.locationType.length-1));
        },
        selectPatient: function(event) {
            if (event.keyCode !== undefined && (event.keyCode != ENTER_KEY && event.keyCode != SPACE_KEY)) {
                return;
            }
            var currentLocation = this.model;
            this.searchApplet.confirmationView.updateTemplateToBlank();
            this.searchView.locationSelected(currentLocation);
            this.searchView.selectedLocationModel = currentLocation;
            this.locationCollectionView.$el.find("a.activeItem").removeClass('activeItem');
            $(event.currentTarget).addClass('activeItem');
        }
    });

    return PatientSearchResultView;

}