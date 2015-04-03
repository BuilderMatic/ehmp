var dependencies = [
    "main/ADK",
    "backbone",
    "marionette",
    'underscore',
    "app/applets/lab_results_grid/appletHelpers",
    "app/applets/lab_results_grid/appletUiHelpers",
    "app/applets/lab_results_grid/gridView",
    "app/applets/lab_results_grid/details/detailsView",
    "app/applets/lab_results_grid/modal/modalView",
    "hbs!app/applets/lab_results_grid/list/dateTemplate",
    "hbs!app/applets/lab_results_grid/list/labTestCoverSheetTemplate",
    "hbs!app/applets/lab_results_grid/list/labTestSinglePageTemplate",
    "hbs!app/applets/lab_results_grid/list/resultTemplate",
    "hbs!app/applets/lab_results_grid/list/siteTemplate",
    "hbs!app/applets/lab_results_grid/list/flagTemplate",
    "hbs!app/applets/lab_results_grid/list/referenceRangeTemplate",
    "hbs!app/applets/lab_results_grid/templates/tooltip",
    "app/applets/newsfeed/globalDateHandler"
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(ADK, Backbone, Marionette, _, AppletHelper, AppletUiHelper, GridView, DetailsView, ModalView, dateTemplate, labTestCSTemplate, labTestSPTemplate, resultTemplate, siteTemplate, flagTemplate, referenceRangeTemplate, tooltip, GlobalDateHandler) {


    var fetchOptions = {
        resourceTitle: 'patient-record-lab',
        pageable: true,
        cache: false,
        viewModel: {
            parse: function(response) {
                // Check 'codes' for LOINC codes and Standard test name.
                var lCodes = [];
                var testNames = [];
                if (response.codes) {
                    response.codes.forEach(function(code) {
                        if (code.system.indexOf("loinc") != -1) {
                            lCodes.push(" " + code.code);
                            testNames.push(" " + code.display);
                        }
                    });
                }
                response.loinc = lCodes;
                response.stdTestNames = testNames;

                var low = response.low,
                    high = response.high;

                if (low && high) {
                    response.referenceRange = low + '-' + high;
                }

                if (response.interpretationCode) {
                    var temp = response.interpretationCode.split(":").pop(),
                        flagTooltip = "",
                        labelClass = "label-danger";

                    if (temp === "HH") {
                        temp = "H*";
                        flagTooltip = "Critical High";
                    }
                    if (temp === "LL") {
                        temp = "L*";
                        flagTooltip = "Critical Low";
                    }
                    if (temp === "H") {
                        flagTooltip = "Abnormal High";
                        labelClass = "label-warning";
                    }
                    if (temp === "L") {
                        flagTooltip = "Abnormal Low";
                        labelClass = "label-warning";
                    }
                    response.interpretationCode = temp;
                    response.flagTooltip = flagTooltip;
                    response.labelClass = labelClass;
                }

                if (response.categoryCode) {
                    var categoryCode = response.categoryCode.slice(response.categoryCode.lastIndexOf(':') + 1);
                    switch (categoryCode) {
                        case 'EM':
                        case 'MI':
                        case 'SP':
                        case 'CY':
                        case 'AP':
                            response.result = 'View Report';
                            if (!response.typeName) {
                                response.typeName = response.categoryName;
                            }
                            response.pathology = true;
                            break;
                    }
                }
                return response;
            }
        }
    };

    var gistConfiguration = {
        //Collection fetchOptions

        gistModel: [{
            id: 'shortName',
            field: 'shortName'
        }, {
            id: 'displayName',
            field: 'normalizedName'
        }, {
            id: 'result',
            field: 'result'
        }, {
            id: 'previousInterpretationCode',
            field: 'previousInterpretationCode'
        }, {
            id: 'previousResult',
            field: 'previousResult'
        }, {
            id: 'units',
            field: 'units'
        }, {
            id: 'timeSince',
            field: 'timeSince'
        }, {
            id: 'observationType',
            field: 'observationType'
        }, {
            id: 'tooltip',
            field: 'tooltip'
        }],
        gistHeaders: {
            header1: 'Description',
            header2: 'Results',
            header3: '',
            header4: 'Age'
        },
        defaultView: 'observation',
        enableHeader: 'true',
        graphOptions: {
            height: '19', //defaults to 20
            width: '90', //defaults to 80
            id: '',
            //abnormalRangeWidth: 14, //defaults to Math.floor(w / 6)
            //rhombusA: 6, //defaults to Math.floor(h / 2 * 0.7)
            //rhombusB: 4, //defaults to Math.floor(aw / 2 * 0.7)
            //radius: 3, //defaults to 3
            //minimumDistance: 10, //defaults to 10
            hasCriticalInterpretation: true, //defaults to false
        }
    };

    var InAPanelModel = Backbone.Model.extend({
        parse: fetchOptions.viewModel.parse
    });

    var GistView = ADK.Applets.BaseGridApplet.extend({
        onBeforeDestroy: function() {
            ADK.Messaging.off('globalDate:selected');
        },
        initialize: function(options) {
            this._super = ADK.Applets.BaseGridApplet.prototype;
            var dataGridOptions = {
                filterFields: ['observed', 'typeName', 'flag', 'result', 'specimen', 'groupName', 'isPanel', 'units', 'referenceRange', 'facilityMoniker', 'labs.models'],
                formattedFilterFields: {
                    'observed': function(model, key) {
                        var val = model.get(key);
                        val = val.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/, '$2/$3/$1 $4:$5');
                        return val;
                    }
                },
                gistView: true,
                appletConfiguration: gistConfiguration,
                DetailsView: DetailsView,
                onClickRow: function(model, event, gridView) {
                    event.preventDefault();

                    if (model.get('isPanel')) {
                        if (!$(event.currentTarget).data('isOpen')) {
                            $(event.currentTarget).data('isOpen', true);
                        } else {
                            var k = $(event.currentTarget).data('isOpen');
                            k = !k;
                            $(event.currentTarget).data('isOpen', k);
                        }

                        var i = $(event.currentTarget).find('.js-has-panel i');
                        if (i.length) {
                            if (i.hasClass('fa-chevron-up')) {
                                i.removeClass('fa-chevron-up')
                                    .addClass('fa-chevron-down');
                                $(event.currentTarget).data('isOpen', true);
                            } else {
                                i.removeClass('fa-chevron-down')
                                    .addClass('fa-chevron-up');
                                $(event.currentTarget).data('isOpen', false);
                            }
                        }
                        gridView.expandRow(model, event);
                    } else {
                        AppletUiHelper.getDetailView(model, event.currentTarget, dataGridOptions.collection, true, AppletUiHelper.showModal, AppletUiHelper.showErrorModal);
                    }
                },
                filterDateRangeEnabled: true,
                filterDateRangeField: {
                    name: "observed",
                    label: "Date",
                    format: "YYYYMMDD"
                }
            };

            var self = this;
            //date change handling
            GlobalDateHandler.initialize(function(dateModel) {

                self.dataGridOptions.collection.fetchOptions.criteria.filter = self.buildJdsDateFilter('observed', options);

                self.loading();
                self.setAppletView();
                self.dataGridOptions.collection.reset();
                ADK.ResourceService.fetchCollection(self.dataGridOptions.collection.fetchOptions, self.dataGridOptions.collection);
            });
            fetchOptions.onSuccess = function(collection) {
                var fullCollection = collection.fullCollection || collection;

                fullCollection.each(function(result) {
                    var resultAttributes = _.values(result.attributes);

                    if (typeof resultAttributes[0][0] === 'object') {
                        var currentPanel = resultAttributes[0];
                        var currentPanelFirstLab = currentPanel[0];
                        var panelGroupName = _.keys(result.attributes)[0];

                        var group = panelGroupName,
                            id = group.replace(/\s/g, ''),
                            tempCode = "",
                            tempTooltip = "",
                            labelClass = "";

                        _.each(currentPanel, function(lab, i) {
                            lab = new InAPanelModel(InAPanelModel.prototype.parse(lab));

                            if (lab.attributes.interpretationCode == "H*") {
                                tempCode = "H*";
                                tempTooltip = "Critical High";
                                labelClass = "label-danger";

                            } else if (lab.attributes.interpretationCode == "L*") {
                                if (tempCode == "H" || tempCode == "L" || tempCode === "") {
                                    tempCode = "L*";
                                    tempTooltip = "Critical Low";
                                    labelClass = "label-danger";
                                }
                            } else if (lab.attributes.interpretationCode == "H") {
                                if (tempCode == "L" || tempCode === "") {
                                    tempCode = "H";
                                    tempTooltip = "Abnormal High";
                                    labelClass = "label-warning";
                                }
                            } else if (lab.attributes.interpretationCode == "L") {
                                if (tempCode === "") {
                                    tempCode = "L";
                                    tempTooltip = "Abnormal Low";
                                    labelClass = "label-warning";
                                }
                            }
                            currentPanel[i] = lab;
                        });

                        var tempUid = panelGroupName.replace(/\s/g, '') + "_" + currentPanelFirstLab.groupUid.replace(/\s/g, '');
                        tempUid = tempUid.replace('#', '');

                        result.set({
                            labs: new Backbone.Collection(currentPanel),
                            observed: currentPanelFirstLab.observed,
                            isPanel: 'Panel',
                            typeName: group,
                            panelGroupName: panelGroupName,
                            facilityCode: currentPanelFirstLab.facilityCode,
                            facilityMoniker: currentPanelFirstLab.facilityMoniker,
                            interpretationCode: tempCode,
                            flagTooltip: tempTooltip,
                            labelClass: labelClass,
                            uid: tempUid,
                            type: 'panel'
                        });
                    }
                });

                var sortedModels = _.sortBy(fullCollection.models, function(lab) {
                    return -(lab.attributes.observed);
                });

                fullCollection.reset(sortedModels);

                if (options.appletConfig !== undefined && options.appletConfig.viewType !== undefined && options.appletConfig.viewType === 'gist') {
                    var modifiedCollection = self.modifyModel(fullCollection);
                    modifiedCollection = self.addTooltips(modifiedCollection, 4);
                    fullCollection.reset(modifiedCollection.models);
                }
            };
            fetchOptions.criteria = {
                filter: this.buildJdsDateFilter('observed')
            };

            /*            ADK.Messaging.on('globalDate:selected', function(dateModel) {
                            self.dateRangeRefresh('observed');
                        });*/

            dataGridOptions.collection = ADK.PatientRecordService.fetchCollection(fetchOptions);

            this.dataGridOptions = dataGridOptions;
            if (!self.isFullscreen) {
                if (dataGridOptions.gistView === true) {
                    this.dataGridOptions.SummaryView = ADK.Views.LabresultsGist.getView();
                    this.dataGridOptions.SummaryViewOptions = {
                        gistHeaders: gistConfiguration.gistHeaders
                    };
                }
            }
            this._super.initialize.apply(this, arguments);

            var message = ADK.Messaging.getChannel('lab_results');
            message.reply('gridCollection', function() {
                return self.gridCollection;
            });

        },
        onRender: function() {
            this._super.onRender.apply(this, arguments);
        },
        addTooltips: function(collectionItems, limit) {
            for (var i = 0; i < collectionItems.models.length; i++) {
                var attr = collectionItems.models[i].attributes;
                if (attr.oldValues) {
                    attr.limitedoldValues = attr.oldValues.splice(0, limit);
                    if ((attr.oldValues.length - attr.limitedoldValues.length) > 0) {
                        attr.moreresultsCount = attr.oldValues.length - attr.limitedoldValues.length;
                    }
                }
                collectionItems.models[i].attributes.tooltip = tooltip(attr);
            }
            return collectionItems;
        },
        modifyModel: function(collectionItems) {
            var modifiedCollection = {};
            //Create deep clone for collection
            _.extend(modifiedCollection, collectionItems);
            //Reset models field for the new collection
            modifiedCollection.models = [];

            for (var i = 0; i < collectionItems.models.length; i++) {
                //Only laboratory results should be visible
                if (collectionItems.models[i].attributes.kind !== undefined && collectionItems.models[i].attributes.kind === 'Laboratory') {
                    //Add fields necessary to the gist mmodel
                    collectionItems.models[i].attributes.timeSince = AppletHelper.setTimeSince(collectionItems.models[i].attributes.observed);
                    collectionItems.models[i].attributes.observedFormatted = AppletHelper.getObservedFormatted(collectionItems.models[i].attributes.observed);
                    collectionItems.models[i].attributes.numericTime = AppletHelper.getNumericTime(collectionItems.models[i].attributes.timeSince);
                    collectionItems.models[i].attributes.observationType = 'labs';
                    collectionItems.models[i].attributes.shortName = collectionItems.models[i].attributes.typeName;
                    if (collectionItems.models[i].attributes.typeName.indexOf(',') >= 0) {
                        collectionItems.models[i].attributes.shortName = collectionItems.models[i].attributes.typeName.substring(0, collectionItems.models[i].attributes.typeName.indexOf(','));
                    }
                    collectionItems.models[i].attributes.graphOptions = gistConfiguration.graphOptions;
                    collectionItems.models[i].attributes.normalizedName = collectionItems.models[i].attributes.typeName.replace(/\W/g, '_');
                    //Initialize modifiedCollection models field.
                    if (modifiedCollection.models.length === 0) {
                        modifiedCollection.models.push(collectionItems.models[i]);
                    } else {
                        //found is true when we find another item in the modifiedCollection with the same typeName
                        var found = false;
                        for (var j = 0; j < modifiedCollection.models.length; j++) {
                            //If the modifiedCollection item has the same typeName as the initial collectionItems item
                            if (modifiedCollection.models[j].attributes.typeName === collectionItems.models[i].attributes.typeName) {
                                //We will put the old values with the same typeName in the oldValues array within the attributes
                                if (modifiedCollection.models[j].attributes.oldValues === undefined) {
                                    //Initialize the oldValues if this is the second value found in the collectionItems
                                    modifiedCollection.models[j].attributes.oldValues = [];
                                    //Previous value represents the second value with the same typeName of the collectionItems array
                                    modifiedCollection.models[j].attributes.previousResult = collectionItems.models[i].attributes.result;
                                    modifiedCollection.models[j].attributes.previousInterpretationCode = collectionItems.models[i].attributes.interpretationCode;
                                }
                                modifiedCollection.models[j].attributes.oldValues.push(collectionItems.models[i]);
                                found = true;
                            }
                        }
                        //If this is the first time when we encounter the typeName we add it to the modifiedCollection
                        if (!found) modifiedCollection.models.push(collectionItems.models[i]);
                    }
                }

            }
            modifiedCollection.length = modifiedCollection.models.length;
            return modifiedCollection;
        }
    });

    var applet = {
        id: 'lab_results_grid',
        hasCSS: true,
        viewTypes: [{
            type: 'summary',
            view: GridView.extend({
                columnsViewType: "summary"
            }),
            chromeEnabled: true
        }, {
            type: 'expanded',
            view: GridView.extend({
                columnsViewType: "expanded"
            }),
            chromeEnabled: true
        }, {
            type: 'gist',
            view: GistView.extend({
                columnsViewType: "gist"
            }),
            chromeEnabled: true
        }],
        defaultViewType: 'summary'
    };


    // expose detail view through messaging
    var channel = ADK.Messaging.getChannel(applet.id);

    channel.on('getDetailView', function(params) {
        ADK.showModal(
            new ModalView({
                model: params.model,
                navHeader: false
            }), {
                size: "large",
                title: params.model.get('typeName')
            });
    });

    channel.reply('detailView', function(params) {

        var fetchOptions = {
            criteria: {
                "uid": params.uid
            },
            patient: new Backbone.Model({
                icn: params.patient.icn,
                pid: params.patient.pid
            }),
            resourceTitle: 'uid',
            viewModel: {
                parse: AppletHelper.parseLabResponse
            }
        };

        var response = $.Deferred();

        var data = ADK.PatientRecordService.fetchCollection(fetchOptions);
        data.on('sync', function() {
            var detailModel = data.first();

            var onSuccess = function(detailView) {
                response.resolve({
                    view: detailView,
                    title: AppletHelper.getModalTitle(detailModel)
                });
            };
            var onFail = function(errorMsg) {
                response.reject(errorMsg);
            };

            AppletUiHelper.getDetailView(detailModel, null, data, false, onSuccess, onFail);
        }, this);

        return response.promise();
    });

    return applet;
}