var dependencies = [
    'jquery',
    'underscore',
    'main/Utils',
    'main/backgrid/datagrid',
    'main/backgrid/filter',
    'api/ResourceService',
    'api/SessionStorage',
    'main/components/views/loadingView',
    'main/components/views/errorView',
    'main/components/applets/grid_applet/views/filterDateRangeView',
    'hbs!main/components/applets/grid_applet/templates/containerTemplate',
    'main/components/applets/grid_applet/gists/gistView'
];

define(dependencies, onResolveDependencies);

function onResolveDependencies($, _, utils, DataGrid, CollectionFilter, ResourceService, SessionStorage, LoadingView, ErrorView, FilterDateRangeView, containerTemplate, GistView) {
    'use strict';

    var SCROLL_TRIGGERPOINT = 40;
    var SCROLL_ADDITIONAL_ROWS = 100;
    var INITIAL_NUMBER_OF_ROWS = 30;

    var AppletLayoutView = Backbone.Marionette.LayoutView.extend({
        initialize: function(options) {
            if (this.options.appletConfig && _.isUndefined(this.options.appletConfig.instanceId)) {
                this.options.appletConfig.instanceId = this.options.appletConfig.id;
            } else if (!this.options.appletConfig) {
                this.options.appletConfig = {};
                this.options.appletConfig.id = this.dataGridOptions.appletConfig.id;
                this.options.appletConfig.instanceId = this.dataGridOptions.appletConfig.instanceId;
            }

            var appletConfig = this.options.appletConfig;
            this.appletConfig = appletConfig;
            var dataGridOptions = this.dataGridOptions || {}; //Set in extending view
            this.dataGridOptions = dataGridOptions;
            dataGridOptions.emptyText = dataGridOptions.emptyText || 'No Records Found';
            this.listenTo(dataGridOptions.collection, 'sync', this.onSync);
            this.listenTo(dataGridOptions.collection, 'error', this.onError);


            dataGridOptions.appletConfig = appletConfig;
            this.routeParam = this.options.routeParam;
            //Set default filterEnabled
            if (dataGridOptions.filterEnabled === undefined) {
                dataGridOptions.filterEnabled = true;
            }

            //Set Data Grid Columns
            if (appletConfig.fullScreen) {
                dataGridOptions.columns = dataGridOptions.fullScreenColumns || dataGridOptions.summaryColumns || dataGridOptions.columns;
                SessionStorage.setAppletStorageModel(this.appletConfig.instanceId, 'fullScreen', true);
            } else {
                dataGridOptions.columns = dataGridOptions.summaryColumns || dataGridOptions.columns;
                SessionStorage.setAppletStorageModel(this.appletConfig.instanceId, 'fullScreen', false);
            }

            this.model = new Backbone.Model(appletConfig);

            //Create Filter and Filter Button View
            if (dataGridOptions.filterEnabled === true) {
                var filterFields;
                if (dataGridOptions.filterFields) {
                    filterFields = dataGridOptions.filterFields;
                } else {
                    filterFields = _.pluck(dataGridOptions.columns, 'name');
                }

                var filterOptions = {
                    collection: dataGridOptions.collection,
                    filterFields: filterFields,
                    filterDateRangeEnabled: dataGridOptions.filterDateRangeEnabled,
                    filterDateRangeField: dataGridOptions.filterDateRangeField,
                    id: appletConfig.instanceId,
                    formattedFilterFields: dataGridOptions.formattedFilterFields
                };

                this.filterView = CollectionFilter.create(filterOptions);

                dataGridOptions.appletId = appletConfig.id;
                dataGridOptions.instanceId = appletConfig.instanceId;
                if (dataGridOptions.filterDateRangeEnabled) {
                    this.filterDateRangeView = new FilterDateRangeView({
                        model: new Backbone.Model(dataGridOptions),
                        appletId: dataGridOptions.appletId,
                        appletView: this
                    });
                }
            }

            if (this.dataGridOptions.hasOwnProperty('onClickAdd')) {
                this.onClickAdd = this.dataGridOptions.onClickAdd;
            }

            if (this.dataGridOptions.toolbarView) {
                this.toolbarView = this.dataGridOptions.toolbarView;
            }

            //Create Data Grid View
            this.setAppletView();

            //Create Loading View
            this.loadingView = LoadingView.create();
        },
        setAppletView: function() {
            if (this.dataGridOptions.collection instanceof Backbone.PageableCollection) {
                if (this.appletConfig.fullScreen || this.appletConfig.fullScreen === true) {
                    this.dataGridOptions.collection.setPageSize(100, {
                        silent: true
                    });
                } else {
                    this.dataGridOptions.collection.setPageSize(INITIAL_NUMBER_OF_ROWS, {
                        silent: true
                    });
                }
            }
            if (!this.appletConfig.fullScreen && this.dataGridOptions.SummaryView) {

                var summaryViewOptions = this.dataGridOptions.SummaryViewOptions || {};
                summaryViewOptions.collection = this.dataGridOptions.collection;
                summaryViewOptions.appletConfig = this.appletConfig;

                this.dataGridView = new this.dataGridOptions.SummaryView(summaryViewOptions);
            } else if (this.dataGridOptions.gistView) {
                this.dataGridView = new GistView(this.dataGridOptions);
            } else {
                this.dataGridView = DataGrid.create(this.dataGridOptions);
            }
        },
        onRender: function() {
            window.scrollTo(0, 0);
            this.loading();
            var self = this;
            if (this.filterView) {
                $(this.filterView.el).css({
                    marginLeft: '0px',
                    marginTop: '0px',
                    marginBottom: '6px'
                });

                this.gridFilter.show(this.filterView);
                var queryInputSelector = 'input[name=\'q-' + this.appletConfig.instanceId + '\']';

                this.filterView.$el.find('input[type=search]').on('change', function() {
                    SessionStorage.setAppletStorageModel(self.appletConfig.instanceId, 'filterText', $(this).val());
                    SessionStorage.setAppletStorageModel(self.appletConfig.id, 'filterText', $(this).val());
                });

                this.filterView.$el.find('a[data-backgrid-action=clear]').on('click', function() {
                    SessionStorage.setAppletStorageModel(self.appletConfig.id, 'filterText', $(this).val());
                });

                if (this.dataGridOptions.filterDateRangeEnabled && this.appletConfig.fullScreen) {
                    this.gridFilterDateRange.show(this.filterDateRangeView);
                }

                $('.grid-filter').find('input').attr('tabindex', '0');
            }
            if (this.dataGridOptions.collection instanceof Backbone.PageableCollection) {
                if (!this.appletConfig.fullScreen || this.appletConfig.fullScreen !== true) {
                    this.$el.find('#grid-panel-' + this.appletConfig.id).on('scroll', function(event) {
                        self.fetchRows(event);
                    });
                }

            }
        },
        template: containerTemplate,
        regions: {
            gridContainer: '.grid-container',
            gridToolbar: '.grid-toolbar',
            gridFilterDateRange: '.grid-filter-daterange',
            gridFilter: '.grid-filter'
        },
        // events: {
        //     'click .applet-maximize-button': 'expandApplet',
        //     'click .applet-minimize-button': 'minimizeApplet',
        //     'click .applet-refresh-button': 'refresh',
        //     'click .applet-add-button': 'onClickAdd',
        //     'click .applet-options-button': 'displaySwitchboard',
        //     'click .applet-exit-options-button': 'closeSwitchboard'
        // },
        eventMapper: {
            'refresh': 'refresh',
            'add': 'onClickAdd'
        },
        fetchRows: function(event) {
            var e = event.currentTarget;
            if ((e.scrollTop + e.clientHeight + SCROLL_TRIGGERPOINT > e.scrollHeight) && this.dataGridOptions.collection.hasNextPage()) {
                event.preventDefault();
                this.dataGridOptions.collection.setPageSize(this.dataGridOptions.collection.state.pageSize + SCROLL_ADDITIONAL_ROWS);
            }
        },
        toolbar: function() {
            if (this.toolbarView) {
                this.gridToolbar.show(this.toolbarView);
            }
        },
        onSync: function(collection) {
            $("[data-instanceid='" + this.appletConfig.instanceId + "']").find('.fa-refresh').removeClass('fa-spin');
            this.toolbar();

            if (this.filterView) {
                var searchText = SessionStorage.getAppletStorageModel(this.appletConfig.instanceId, 'filterText');
                if (searchText !== undefined && searchText !== null && searchText.trim().length > 0) {
                    this.filterView.search();
                }
            }
            if (this.dataGridOptions.gistView) {
                //this.dataGridOptions.collection.trigger('collectionSynced');

                /* Adds Fields to the collection that match Gist Fields. It is up to the applet to provide the correct gist field names */
                /* Mapping done here to avoid double rendering in initialize */

                var options = this.dataGridOptions;
                _.each(collection.models, function(item) {
                    _.each(options.appletConfiguration.gistModel, function(object) {
                        var id = object.id;
                        item.set(object.id, item.get(object.field));
                    });

                });
                this.dataGridOptions.collection.reset(collection.models);

                this.gridContainer.show(this.dataGridView, {
                    preventDestroy: true
                });
            } else {
                this.gridContainer.show(this.dataGridView, {
                    preventDestroy: true
                });
            }

            if (this.dataGridOptions.collection instanceof Backbone.PageableCollection) {
                if (this.appletConfig.fullScreen || this.appletConfig.fullScreen === true) {
                    var self = this;
                    this.$el.find('.data-grid').on('scroll', function(event) {
                        self.fetchRows(event);
                    });
                    this.$el.find('.data-grid').trigger("scroll");
                } else {
                    this.$el.find('#grid-panel-' + this.appletConfig.id).trigger("scroll");
                }
            }
        },
        onError: function(collection, resp) {
            var errorModel = new Backbone.Model(resp);
            var errorView = ErrorView.create({
                model: errorModel
            });
            this.gridContainer.show(errorView, {
                preventDestroy: true
            });
        },
        loading: function() {
            this.gridContainer.show(this.loadingView, {
                preventDestroy: true
            });
        },
        refresh: function(event) {
            if (this.dataGridOptions.refresh !== undefined) {
                this.loading();
                this.dataGridOptions.refresh(this);
                return;
            }
            var collection = this.dataGridOptions.collection;
            if (this.dataGridOptions.collection instanceof Backbone.PageableCollection) {
                collection.setPageSize(INITIAL_NUMBER_OF_ROWS, {
                    silent: true
                });
            }
            this.loading();
            this.setAppletView();
            if (collection instanceof Backbone.PageableCollection) {
                collection.fullCollection.reset();
            } else {
                collection.reset();
            }
            ResourceService.clearCache(collection.url);
            ResourceService.fetchCollection(collection.fetchOptions, collection);
        },
        buildJdsDateFilter: function(dateField, options) {
            var isOverrideGlobalDate, fromDate, toDate, customFilter, operator;

            options = options || {};
            _.defaults(options, {
                isOverrideGlobalDate: false,
                operator: 'and'
            }); // by default use global date
            isOverrideGlobalDate = options.isOverrideGlobalDate;
            customFilter = options.customFilter;
            operator = options.operator;

            if (isOverrideGlobalDate) {
                fromDate = options.fromDate;
                toDate = options.toDate;
            } else {
                var globalDate = SessionStorage.getModel('globalDate');
                if (globalDate.get('selectedId') !== undefined && globalDate.get('selectedId') !== null) {
                    fromDate = globalDate.get('fromDate');
                    toDate = globalDate.get('toDate');
                }
            }

            if (fromDate === undefined || fromDate === null || fromDate.trim().length === 0) {
                fromDate = '';
            } else {
                fromDate = '"' + utils.formatDate(fromDate, 'YYYYMMDD', 'MM/DD/YYYY') + '"';
            }

            if (toDate === undefined || toDate === null || toDate.trim().length === 0) {
                toDate = '';
            } else {
                toDate = '"' + utils.formatDate(toDate, 'YYYYMMDD', 'MM/DD/YYYY') + '235959"';
            }

            var dateFilter;

            if (fromDate !== '' && toDate !== '') {
                dateFilter = 'between(' + dateField + ',' + fromDate + ',' + toDate + ')';
            } else if (fromDate === '' && toDate !== '') {
                dateFilter = 'lte(' + dateField + ',' + toDate + ')';
            } else if (fromDate !== '' && toDate === '') {
                dateFilter = 'gte(' + dateField + ',' + fromDate + ')';
            } else {
                console.error('gridAppletView buildJdsDateFilter both fromDate and toDate are empty.');
            }

            if (customFilter !== undefined && customFilter !== null) {
                dateFilter = operator + '(' + dateFilter + ',' + customFilter + ')';
            }

            return dateFilter;
        },
        dateRangeRefresh: function(filterParameter, options) {
            this.dataGridOptions.collection.fetchOptions.criteria.filter =
                this.buildJdsDateFilter(filterParameter, options);

            var collection = this.dataGridOptions.collection;
            if (this.dataGridOptions.collection instanceof Backbone.PageableCollection) {
                collection.setPageSize(INITIAL_NUMBER_OF_ROWS, {
                    silent: true
                });
            }
            this.loading();

            if (this.dataGridOptions.gistView) {
                this.dataGridView = new GistView(this.dataGridOptions);
            } else {
                this.dataGridView = DataGrid.create(this.dataGridOptions);
            }
            if (collection instanceof Backbone.PageableCollection) {
                collection.fullCollection.reset();
            } else {
                collection.reset();
            }
            ResourceService.fetchCollection(collection.fetchOptions, collection);
        },
        onClickAdd: function(event) {
            this.onClickAdd(event);
        },
        expandRowDetails: function(routeParam) {
            if (routeParam) {
                var row = $('#' + routeParam);
                row.click();
                windowHeight = $(window).height();
                scrollPosition = row.offset().top;
                if ((scrollPosition + row.next().height() + 50) > windowHeight) {
                    $('html, body').animate({
                        scrollTop: scrollPosition - 100
                    }, 0);
                }
            }
        },
        showFilterView: function() {
            var filterText = SessionStorage.getAppletStorageModel(this.appletConfig.instanceId, 'filterText');
            if (_.isUndefined(filterText) || _.isNull(filterText)) {
                filterText = SessionStorage.getAppletStorageModel(this.appletConfig.id, 'filterText');
            }
            if (this.dataGridOptions.filterEnabled === true && filterText !== undefined && filterText !== null && filterText.length > 0) {
                this.$el.find('#grid-filter-' + this.appletConfig.instanceId).toggleClass('collapse in');
                this.$el.find('input[name=\'q-' + this.appletConfig.instanceId + '\']').val(filterText);
                this.filterView.showClearButtonMaybe();
            } else if (this.dataGridOptions.filterDateRangeEnabled && this.appletConfig.fullScreen) {
                this.$el.find('#grid-filter-' + this.appletConfig.instanceId).toggleClass('collapse in');
            }
        },
        onShow: function() {
            this.showFilterView();
        }
    });

    return AppletLayoutView;
}