var dependencies = [
    "main/ADK",
    "backbone",
    "marionette",
    "underscore",
    "hbs!app/applets/lab_results_grid/details/singleLabResultTemplateForPanelExtendedRow",
    "app/applets/lab_results_grid/modal/modalView",
    "app/applets/lab_results_grid/appletUiHelpers"
];
'use strict';
define(dependencies, onResolveDependencies);

function onResolveDependencies(ADK, Backbone, Marionette, _, rowTemplate, modalView, AppletUiHelper) {
    return Backbone.Marionette.ItemView.extend({
        tagName: "tr",
        attributes: {
            'tabindex': '0'
        },
        initialize: function(options) {
            var listen = ADK.Messaging.getChannel('lab_results');
            this.gridCollection = listen.request('gridCollection');
            this.$el.data('model', this.model);
        },
        template: rowTemplate,
        events: {
            'click': 'displayModal',
            'keyup': 'triggerClick'
        },
        triggerClick: function(e) {
            if (e.keyCode === 13) {
                this.$el.trigger('click');
            }
        },
        displayModal: function(e) {
            var self = this;
            e.preventDefault();
            if (!this.model.get('pathology')) {
                AppletUiHelper.getDetailView(this.model, e.currentTarget, this.gridCollection, true, AppletUiHelper.showModal, AppletUiHelper.showErrorModal);

            } else {
                var uid = model.get('results')[0].resultUid;
                var currentPatient = ADK.PatientRecordService.getCurrentPatient();
                ADK.Messaging.getChannel("lab_results_grid").trigger('resultClicked', {
                    uid: uid,
                    patient: {
                        icn: currentPatient.attributes.icn,
                        pid: currentPatient.attributes.pid
                    }
                });
            }

        }
    });
}