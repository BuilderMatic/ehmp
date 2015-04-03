var dependencies = [
    "backbone",
    "marionette",
    "underscore",
    "main/ADK",
    "hbs!main/components/patient/smokingStatus/smokingStatusTemplate"
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(Backbone, Marionette, _, ADK, smokingStatusTemplate) {

    var SmokingStatusModal = {
        displayModal: function(){
            var self = SmokingStatusModal;
            var modalOptions = {
                title: 'Smoking Status',
                size: 'medium',
                footerView: self.getFooterView()
            };

            ADK.showModal(self.getModalView(), modalOptions);
            $('#mainModal').show();
        },
        getModalView: function(){
            var ModalView =  Backbone.Marionette.ItemView.extend({
               template: smokingStatusTemplate,
                events: {
                    'keydown .error-container': 'handleKeyPress'
                },
                handleKeyPress: function(e){
                    if(e.keyCode === 9){
                        e.preventDefault();
                        e.stopPropagation();
                        $('#ssEveryDay').focus();
                    }
                }
            });

            return new ModalView();
        },
        getFooterView: function(){
            return Backbone.Marionette.ItemView.extend({
                template: _.template('<button class="btn btn-default" type="button" data-dismiss="modal"  id="smokingStatusCancel">Cancel</button><button class="btn btn-primary" type="button" id="smokingStatusSave">Save</button>'),
                events: {
                    'click #smokingStatusSave': 'handleNext'
                },
                handleNext: function(){
                    var smokingStatusChannel = ADK.Messaging.getChannel('smokingstatus');
                    var selectedInput = $('#smokingStatusModal input:checked')[0];
                    var model = new SmokingStatusModel();
                    model.set('snowmedCode', selectedInput.value);
                    var statusText = $(selectedInput).parent().text().trim();
                    model.set('text', statusText);
                    model.save(null, {
                        success:function() {
                            ADK.hideModal();
                            smokingStatusChannel.command('smokingstatus:updated', statusText);
                        },
                        error: function() {
                            $('#smokingStatusModal .error-container').text('Save Failed');
                            $('#smokingStatusModal .error-container').focus();
                        }
                    });
                }
            });
        }
    };

    function sendAuthentication(xhr, settings) {
        var userSession = ADK.UserService.getUserSession(),
            user = userSession.attributes.username,
            pass = userSession.attributes.password,
            token = user.concat(":", pass);

        xhr.setRequestHeader('Authorization', ("Basic ".concat(btoa(token))));
    }

    var SmokingStatusModel = Backbone.Model.extend({
        sync: function(method, model, options) {

            var params = {
                type: 'POST',
                beforeSend: sendAuthentication,
                url: model.url(),
                contentType: "application/json",
                data: JSON.stringify(model.toJSON()),
                dataType: "json"
            };

            $.ajax(_.extend(params, options));

        },
        url: function() {
            var pid = ADK.PatientRecordService.getCurrentPatient().get('pid');
            return ADK.ResourceService.buildUrl('smoking-status', {'pid' : pid});
        }
    });

    var SmokingStatusView  = {
        handleStatusChange: function(){
            var patient = ADK.PatientRecordService.getCurrentPatient();

            if(patient.get('visit')){
                SmokingStatusModal.displayModal();
            }else {
                var visitChannel = ADK.Messaging.getChannel('visit');
                visitChannel.command('openVisitSelector', 'smokingstatus');
                visitChannel.on('set-visit-success:smokingstatus', SmokingStatusModal.displayModal);
            }
        }
    };

    return SmokingStatusView;
}