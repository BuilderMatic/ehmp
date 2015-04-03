var dependencies = [
    "main/ADK",
    'backbone',
    'marionette',
    'underscore',
    'moment',
    'app/applets/documents/debugFlag',
    'app/applets/documents/appletHelper',
    'app/applets/documents/docDetailsDisplayer',
    'app/applets/documents/detail/overviewDetailView',
    'app/applets/documents/detailCommunicator',
    'app/applets/reports/collectionHandler',
    'hbs!app/applets/documents/detail/detailWrapperTemplate'
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(ADK, Backbone, Marionette, _, moment, DEV, appletHelper, DocDetailsDisplayer, OverviewDetailView, DetailCommunicator, CollectionHandler, detailWrapperTemplate) {
    var DEBUG = DEV.flag;
    var serverDateFilter = DEV.serverDateFilter;
    var defGroupByView = DEV.GroupByView;
    var selectedDocument = null;
    var opts;
    //The important changes are in the columns array as well as replacing the dataGridOptions.groupBy logic with this:   dataGridOptions.groupable = this.options.groupView;
    var fullScreenColumns = [{
        name: 'dateDisplay',
        label: 'Date',
        editable: false,
        cell: 'string',
        sortValue: function(model, string) { //this is what needs to change to server-side sorting
            return model.get('referenceDateTime');
        },
        groupable: true,
        groupableOptions: {
            primary: true,
            innerSort: 'referenceDateTime',
            groupByFunction: function(collectionElement) {
                return collectionElement.model.get("referenceDateTime").substr(0, 6);
            },
            //this takes the item returned by the groupByFunction
            groupByRowFormatter: function(item) {
                return moment(item, "YYYYMM").format("MMMM YYYY");
            }
        }
    }, {
        name: 'localTitle',
        label: 'Description',
        editable: false,
        cell: 'string',
        groupable: true,
        groupableOptions: {
            innerSort: "referenceDateTime"
        }

    }, {
        name: 'kind',
        label: 'Type',
        editable: false,
        cell: 'string',
        groupable: true,
        groupableOptions: {
            innerSort: "referenceDateTime"
        }
    }, {
        name: 'authorDisplayName',
        label: 'Entered By',
        editable: false,
        cell: 'string',
        groupable: true,
        groupableOptions: {
            innerSort: "referenceDateTime"
        }
    }, {
        name: 'facilityMoniker',
        label: 'Facility',
        editable: false,
        cell: 'string',
        groupable: true,
        groupableOptions: {
            innerSort: "referenceDateTime"
        }
    }];
    var summaryColumns = [fullScreenColumns[0], fullScreenColumns[2], fullScreenColumns[3]];

    var dataGridOptions = {
        filterEnabled: true, //make sure the filter is actully on screen

        //row click handler
        onClickRow: function(model, event) {
            // console.log("Doc Tab App -----> onClickRow");
            // console.log('opts-----------------', opts.appletConfig.fullScreen);

            var docType = model.get('kind');
            var complexDocBool = model.get('complexDoc');
            var fetchedCollection;

            if (complexDocBool) {
                //if(DEBUG) console.log(model);
                fetchedCollection = appletHelper.getResultsFromUid(model);
            }

            if ($('#center').hasClass('col-md-12')) {
                var $clickedTr = $(event.target).closest('tr');
                var originalRowTop = $clickedTr.offset().top;

                $("#center").find(".data-grid").removeClass('col-md-12');
                $("#center").find(".data-grid").addClass('col-md-6');

                if ($("#doc-detail-region").length === 0) {
                    $("#center").find(".grid-container div:first-child").append(detailWrapperTemplate({}));
                    // .append('<div id="doc-detail-region" class="col-md-6" role="complementary" ></div>');

                    this.parent.addRegion("docDetail", "#doc-detail-region");
                } else {
                    $('#doc-detail-wrapper').removeClass('hide');
                }
                if (this.parent !== undefined) {
                    this.parent.hiddenColumns = true;
                    this.parent.changeView(model, docType, fetchedCollection);
                }
                // console.log('debug------model---', model);

                // update scroll position of summary table so clicked row stays at the same position on the screen
                var originalScrollTop = $clickedTr.closest('.data-grid').scrollTop();
                var newRowTop = $clickedTr.offset().top;
                var diffRowTop = newRowTop - originalRowTop;
                var targetScrollTop = originalScrollTop + diffRowTop;
                $clickedTr.closest('.data-grid').scrollTop(targetScrollTop);

                // shift focus to the detail view title
                selectedDocument = $(':focus');
                $('.docDetailTitle').focus();
            } else {

                if (this.parent !== undefined) {
                    this.parent.changeModelView(model, docType, fetchedCollection);
                }
            }
        }
    };

    //------------------------------------------------------------

    var filterOptions = {
        filterFields: ['dateDisplay', 'localTitle', 'kind', 'authorDisplayName', 'facilityName']
    };
    //------------------------------------------------------------

    var GridApplet = ADK.Applets.BaseGridApplet;
    var AppletLayoutView = GridApplet.extend({
        className: 'reportApp',
        lastTypeClicked: 'unk',
        hiddenColumns: false,
        events: function() {
            return _.extend({}, GridApplet.prototype.events, {
                'click .hideDetail': 'hideDetail'
            });
        },
        showGridView: function() {
            this.refreshGrid(false);
        },
        groupByView: function() {
            this.refreshGrid(true);
        },
        initialize: function(options) {
            if (DEBUG) console.log("Doc Tab App -----> init start");
            opts = this.options = options;
            // GroupByView or GridView
            this.options.groupView = defGroupByView;
            // this.docDetailView = new DocDetailView();
            _super = GridApplet.prototype;
            dataGridOptions.parent = this;
            var self = this;

            dataGridOptions.summaryColumns = summaryColumns;
            dataGridOptions.fullScreenColumns = fullScreenColumns;
            dataGridOptions.collection = CollectionHandler.queryCollection(this);
            dataGridOptions.appletConfig = options.appletConfig;
            dataGridOptions.groupable = this.options.groupView;
            this.listenTo(CollectionHandler, "resetCollection", function(newCollection) {
                if (DEBUG) console.log("Doc Tab App -----> resetCollection event");
                //console.log(JSON.stringify(newCollection));
                this.dataGridOptions.collection.reset(newCollection);
            }, this);

            ADK.Messaging.on('globalDate:selected', function(date) {
                if (DEBUG) console.log("Doc Tab date filter range----->" + JSON.stringify(date));
                if (!serverDateFilter) {
                    if (appletHelper.globalFilterStatus(date)) {
                        appletHelper.hideAppFilter();
                    } else {
                        appletHelper.showAppFilter();
                    }
                    // hide detail view
                    self.hideDetail();
                    if (DEBUG) console.log("Doc Tab client side filter refresh");
                    CollectionHandler.queryCollection(date.attributes.fromDate, date.attributes.toDate);
                } else {
                    // hide detail view
                    self.hideDetail();
                    if (DEBUG) console.log("Doc Tab server side filter refresh");
                    CollectionHandler.queryCollection(self);

                }
            }, this);
            this.dataGridOptions = dataGridOptions;
            _super.initialize.apply(this, arguments);
        },
        refreshGrid: function(groupView) {
            if (DEBUG) console.log("Doc Tab App -----> refreshGrid");
            this.showLoading();
            this.options.groupView = groupView;
            this.initialize(this.options);
        },
        onRender: function() {
            if (DEBUG) console.log("Doc Tab App -----> onRender");
            _super.onRender.apply(this, arguments);
        },
        onShow: function() {
            if (DEBUG) console.log("Doc Tab App -----> onShow");
            if (!defGroupByView) { // Show buttons if Grid View is default
                // Adds Grid View icon to applet title bar
                if ($("#gridView-documents").length === 0) {
                    $("#center").find(".grid-filter-button")
                        .before('<button id="gridView-documents" class="btn btn-xs btn-link" title="Grid View"><span  class="gridView applet-title-button glyphicon glyphicon-th" ><span class="sr-only">Grid View</span></span></button>');
                }
                // Adds Group by View icon to applet title bar
                if ($("#groupByView-documents").length === 0) {
                    $("#center").find(".grid-filter-button")
                        .before('<button id="groupByView-documents" class="btn btn-xs btn-link" title="Group by View"><span class="groupByView applet-title-button glyphicon glyphicon-th-list" ><span class="sr-only">Group by View</span></span></button>');
                }
            }
        },
        changeView: function(newModel, docType, coll) {
            if (DEBUG) console.log("Doc Tab App -----> changeView");
            if (this.lastTypeClicked === docType) {
                this.updateDetailView(newModel);
                this.updateDetailTitle(DocDetailsDisplayer.getTitle(newModel, docType));
            } else {
                var deferredViewResponse = DocDetailsDisplayer.getView(newModel, docType, coll);
                var self = this;
                deferredViewResponse.done(function(results) {
                    self.docDetail.show(results.view);
                    self.updateDetailTitle(results.title || DocDetailsDisplayer.getTitle(newModel, docType));
                    // self.docDetail.show(new DetailWrapperView({
                    //     // childView: DocDetailView,
                    //     // childView: DocDetailsDisplayer.getView(newModel, docType, coll),
                    //     model: newModel,
                    //     collection: coll
                    // }));
                });
            }
            this.$("#doc-detail-wrapper").scrollTop(0);
        },
        changeModelView: function(newModel, docType, coll) {
            if (DEBUG) console.log("Doc Tab App -----> changeView");

            var deferredViewResponse = DocDetailsDisplayer.getView(newModel, docType, coll);
            deferredViewResponse.done(function(results) {
                var modalOptions = {
                    'title': results.title || DocDetailsDisplayer.getTitle(newModel, docType),
                    'size': 'large' //,
                };
                ADK.showModal(results.view, modalOptions);
                $('#mainModal').modal('show');
            });

        },

        updateDetailTitle: function(newTitle) {
            $('#doc_detail_top .docDetailTitle').html(newTitle);
        },

        updateDetailView: function(newModel) {
            if (DEBUG) console.log("Doc Tab App -----> updateDetailView");
            this.docDetailView.model = newModel;
            this.docDetailView.render();
        },

        hideColumns: function() {
            if (DEBUG) console.log("Doc Tab App -----> hideColumns");
            if (this.hiddenColumns === true) {
                $('#data-grid-documents tr *:nth-child(4)').addClass('hide');
                $('#data-grid-documents tr *:nth-child(5)').addClass('hide');
            }
        },

        hideDetail: function() {
            if (DEBUG) console.log("Doc Tab App -----> hideDetail");
            $('#doc-detail-wrapper').addClass('hide');
            $("#center").find(".data-grid").removeClass('col-md-6');
            $("#center").find(".data-grid").addClass('col-md-12');
            //$('#data-grid-documents tr *:nth-child(4)').removeClass('hide');
            //$('#data-grid-documents tr *:nth-child(5)').removeClass('hide');
            this.hiddenColumns = false;

            if (selectedDocument) {
                selectedDocument.focus();
            }
        },

        onBeforeDestroy: function() {
            ADK.Messaging.off('globalDate:selected');
        }
    });


    //------------------------------------------------------------


    var applet = {
        id: 'reports',
        hasCSS: true,
        viewTypes: [{
            type: 'summary',
            view: AppletLayoutView,
            chromeEnabled: true
        }],
        defaultViewType: 'summary'
    };

    DetailCommunicator.initialize(applet.id);

    return applet;
}