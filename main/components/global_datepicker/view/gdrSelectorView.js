var dependencies = [
    'jquery',
    'jquery.inputmask',
    'bootstrap-datepicker',
    'moment',
    'backbone',
    'marionette',
    'underscore',
    'main/components/global_datepicker/view/trendHistoryView',
    'hbs!main/components/global_datepicker/template/gdrSelectorTemplate',
    'api/SessionStorage',
    'main/ADK'
];

define(dependencies, onResolveDependencies);

function onResolveDependencies($, InputMask, DatePicker, moment, Backbone, Marionette, _, TrendHistoryView, gdrSelectorTemplate, SessionStorage, ADK) {

    var DateRangeModel = Backbone.Model.extend({
        defaults: {
            fromDate: moment().subtract('years', 1).format('MM/DD/YYYY'),
            toDate: moment().add('months', 6).format('MM/DD/YYYY'),
            customFromDate: null,
            customToDate: null,
            selectedId: '1yr-range-global'
        }
    });

    var FilterDateRangeView = Backbone.Marionette.LayoutView.extend({
        model: new DateRangeModel(),
        template: gdrSelectorTemplate,
        className: 'global-grid-filter-daterange',
        regions: {
            trendHistoryChart: '#trend-history-chart',
            timelineSummary: '#timeline-summary'
        },
        events: {
            'click .gdt-btn': 'clickButton',
            'keydown .gdt-btn': 'handleEnterOrSpaceBar',
            'keyup .gdt-input': 'keyUpCustomDateRange',
            'blur .gdt-input': 'blurCustomDateRange',
            // 'change input': 'changeCustomDateRange'
        },
        initialize: function() {
            var sessionGlobalDate = ADK.SessionStorage.getModel_SessionStoragePreference('globalDate');
            this.model = sessionGlobalDate.clone();

            var self = this;
            ADK.Messaging.on('updateGlobalTimelineDateRange', function(dateRange) {
                self.$el.find('button').removeClass('active-range');

                var newCustomFromDate = moment(dateRange.from).format('MM/DD/YYYY'),
                    newCustomToDate = moment(dateRange.to).format('MM/DD/YYYY'),
                    formattedDateRange = {
                        from: newCustomFromDate,
                        to: newCustomToDate
                    };

                self.model.set({
                    customFromDate: newCustomFromDate,
                    customToDate: newCustomToDate,
                    selectedId: 'custom-range-apply-global'
                });

                self.$el.find('.input-group.date#custom-date-from-global').datepicker('update', newCustomFromDate);
                self.$el.find('.input-group.date#custom-date-to-global').datepicker('update', newCustomToDate);
                self.$el.find('#custom-range-apply-global').removeAttr('disabled');

                ADK.Messaging.trigger('globalDate:updateTimelineSummaryViewOnly', formattedDateRange);
            });
            ADK.Messaging.on('globalDate:customAllDateRangeDefined', function(dateModel) {
                var firstEventDate = dateModel.get('firstEventDate'),
                    lastEventDate = dateModel.get('lastEventDate');

                self.setCustomDateRange(firstEventDate, lastEventDate, false);
            });
        },
        getTimelineSummaryView: function() {
            var self = this,
            channel = ADK.Messaging.getChannel('timelineSummary'),
            deferredResponse = channel.request('createTimelineSummary');

            deferredResponse.done(function(response) {
                var timelineSummaryApplet = response.view;
                self.timelineSummary.show(timelineSummaryApplet);
            });
        },
        keyUpCustomDateRange: function(event) {
            this.model.set('selectedId', 'custom-range-apply-global');
            this.$el.find('button').removeClass('active-range');
            this.monitorCustomDateRange(false);
        },
        blurCustomDateRange: function(event) {
            this.monitorCustomDateRange(true);
        },
        monitorCustomDateRange: function(triggerUpdateFlag) {
            if (this.model.get('customFromDate') !== this.$el.find('#filter-from-date-global').val() ||
                this.model.get('customToDate') !== this.$el.find('#filter-to-date-global').val()) {
                this.$el.find('button').removeClass('active-range');
                this.model.set('selectedId', 'custom-range-apply-global');

                if (this.checkCustomRangeCondition(triggerUpdateFlag)) {
                    this.$el.find('#custom-range-apply-global').removeAttr('disabled');
                } else {
                    this.$el.find('#custom-range-apply-global').prop('disabled', true);
                }
            }
        },
        isEarlierThanToday: function(date) {
            return moment(date, 'MM/DD/YYYY') < moment();
        },
        checkCustomRangeCondition: function(triggerUpdateFlag) {
            var hasCustomRangeValuesBeenSetCorrectly = true,
            customFromDateStr = this.$el.find('#filter-from-date-global').val(),
            customToDateStr = this.$el.find('#filter-to-date-global').val(),
            customFromDate = moment(customFromDateStr, 'MM/DD/YYYY', true),
            customToDate = moment(customToDateStr, 'MM/DD/YYYY', true),
            todayStr = moment().format('MM/DD/YYYY'),
            today = moment(todayStr, 'MM/DD/YYYY'),
            isDateRangeChanged = false;

            if (customFromDate.isValid()) {
                if (customFromDateStr !== this.model.get('customFromDate')) {
                    if (customFromDate >= today) {
                        this.$el.find('#filter-from-date-global').attr('data-toggle', 'tooltip').attr('data-placement', 'bottom').tooltip('enable').tooltip('show').val('');
                        hasCustomRangeValuesBeenSetCorrectly = false;
                    } else {
                        this.$('#filter-from-date-global').removeAttr('data-toggle').tooltip('hide').tooltip('disable');
                        isDateRangeChanged = true;

                        if (triggerUpdateFlag) {
                            this.model.set('customFromDate', customFromDateStr);
                            // ADK.SessionStorage.addModel('globalDate', this.model);
                        }
                    }
                }
            } else {
                this.$('#filter-from-date-global').removeAttr('data-toggle').tooltip('hide').tooltip('disable');
                hasCustomRangeValuesBeenSetCorrectly = false;
            }

            if (customToDate.isValid()) {
                if (customToDateStr !== this.model.get('customToDate')) {
                    if (customToDate < today) {
                        this.$el.find('#filter-to-date-global').attr('data-toggle', 'tooltip').attr('data-placement', 'bottom').tooltip('enable').tooltip('show').val('');
                        hasCustomRangeValuesBeenSetCorrectly = false;
                    } else {
                        this.$('#filter-to-date-global').removeAttr('data-toggle').tooltip('hide').tooltip('disable');
                        isDateRangeChanged = true;

                        if (triggerUpdateFlag) {
                            this.model.set('customToDate', customToDateStr);
                        }
                    }
                }
            } else {
                this.$('#filter-to-date-global').removeAttr('data-toggle').tooltip('hide').tooltip('disable');
                hasCustomRangeValuesBeenSetCorrectly = false;
            }

            if (triggerUpdateFlag && isDateRangeChanged) {
                ADK.Messaging.trigger('globalDate:customDateRangeSelected', this.model);
            }

            return hasCustomRangeValuesBeenSetCorrectly;
        },
        enableDatePickers: function() {
            var self = this,
                today = new Date(),
                fromDatePicker = this.$('.input-group.date#custom-date-from-global')
                .datepicker({
                    format: 'mm/dd/yyyy',
                    endDate: '-1d'
                }),
                toDatePicker = this.$('.input-group.date#custom-date-to-global')
                .datepicker({
                    format: 'mm/dd/yyyy',
                    startDate: today
                });

            fromDatePicker
                .on('show', function(e) {
                    $('.datepicker').on('mousedown', function(evt) {
                        evt.preventDefault();
                    });
                })
                .on('show', function(e) {
                    toDatePicker.datepicker('hide');
                    $('.datepicker').on('mousedown', function(evt) {
                        evt.preventDefault();
                        evt.stopPropagation();
                    });
                })
                .on('changeDate', function(ev) {
                    $(this).datepicker('hide');
                    self.$el.find('#filter-from-date-global').focus();
                });

            toDatePicker
                .on('show', function(e) {
                    fromDatePicker.datepicker('hide');
                    $('.datepicker').on('mousedown', function(evt) {
                        evt.preventDefault();
                        evt.stopPropagation();
                    });
                })
                .on('changeDate', function(ev) {
                    $(this).datepicker('hide');
                    self.$el.find('#filter-to-date-global').focus();
                });

            this.$('#filter-from-date-global, #filter-to-date-global').datepicker('remove');
        },
        handleEnterOrSpaceBar: function(event) {
            var keyCode = event ? (event.which ? event.which : event.keyCode) : event.keyCode;

            if (keyCode == 13 || keyCode == 32) {
                e.preventDefault();
                var targetElement = this.$el.find('#' + event.target.id);
                targetElement.focus();
                targetElement.trigger('click');
            }
        },
        clickButton: function(event) {
            var selectedId = event.target.id;

            if (selectedId === '') {
                return;
            }

            if (selectedId === 'cancel-global') {
                this.closeExpandedGDT();
                return;
            }

            this.$el.find('button').removeClass('active-range');

            var isApplyButtonClicked = true;
            if (selectedId !== 'custom-range-apply-global') {
                this.$el.find('#' + selectedId).addClass('active-range');
                this.model.set('selectedId', selectedId);

                isApplyButtonClicked = false;
            }

            var fromDate,
                toDate = moment().format('MM/DD/YYYY'); // today by default

            if (selectedId.indexOf('-range-') !== -1 &&
                selectedId.indexOf('custom-range-apply-global') === -1) {
                this.$el.find('#filter-from-date-global').val('');
                this.$el.find('#filter-to-date-global').val('');
                this.$el.find('#custom-range-apply-global').prop('disabled', true);
            }

            switch (selectedId) {
                case 'custom-range-apply-global':
                    if (this.model.get('selectedId') === 'all-range-global') {
                        fromDate = null;
                        toDate = moment('12/31/2099').format('MM/DD/YYYY');
                    } else {
                        fromDate = this.$el.find('#filter-from-date-global').val();
                        toDate = this.$el.find('#filter-to-date-global').val();
                    }
                    break;
                case '2yr-range-global':
                    fromDate = moment().subtract('years', 2).format('MM/DD/YYYY');
                    break;
                case '1yr-range-global':
                    fromDate = moment().subtract('years', 1).format('MM/DD/YYYY');
                    break;
                case '3mo-range-global':
                    fromDate = moment().subtract('months', 3).format('MM/DD/YYYY');
                    break;
                case '1mo-range-global':
                    fromDate = moment().subtract('months', 1).format('MM/DD/YYYY');
                    break;
                case '7d-range-global':
                    fromDate = moment().subtract('days', 7).format('MM/DD/YYYY');
                    break;
                case '72hr-range-global':
                    fromDate = moment().subtract('days', 3).format('MM/DD/YYYY');
                    break;
                case '24hr-range-global':
                    fromDate = moment().subtract('days', 1).format('MM/DD/YYYY');
                    break;
                case 'all-range-global':
                    var sessionGlobalDate = ADK.SessionStorage.getModel_SessionStoragePreference('globalDate');
                    fromDate = sessionGlobalDate.get('firstEventDate');
                    if (fromDate === undefined) {
                        fromDate = null;
                    }

                    var lastEventDate = sessionGlobalDate.get('lastEventDate');
                    if ((lastEventDate !== undefined) && (lastEventDate !== null)) {
                        toDate = lastEventDate;
                    } else {
                        toDate = moment('12/31/2099').format('MM/DD/YYYY');
                    }

                    break;
                default:
                    break;
            }

            if (isApplyButtonClicked) {
                this.closeExpandedGDT();
                if (!(this.model.get('fromDate') === fromDate && this.model.get('toDate') === toDate)) {
                    this.model.set({
                        fromDate: fromDate,
                        toDate: toDate
                    });
                    ADK.SessionStorage.addModel('globalDate', this.model);
                    ADK.Messaging.trigger('globalDate:selected', this.model);
                }
            } else {
                this.setCustomDateRange(fromDate, toDate, true);
                // this.model.set('selectedId', selectedId);
                ADK.Messaging.trigger('globalDate:customDateRangeSelected', this.model);
            }
        },
        closeExpandedGDT: function() {
            $('#navigation-date #hiddenDiv').toggleClass('hidden');
            $('#navigation-date #date-region-minimized').focus();
        },
        setCustomDateRange: function(customFromDate, customToDate, isTrigger) {
            this.model.set({
                customFromDate: customFromDate,
                customToDate: customToDate
            });

            this.$el.find('.input-group.date#custom-date-from-global').datepicker('update', customFromDate);
            this.$el.find('.input-group.date#custom-date-to-global').datepicker('update', customToDate);
            this.$el.find('#custom-range-apply-global').removeAttr('disabled');
        },
        resetToCurrentGlbalDate: function() {
            var globalDate = ADK.SessionStorage.getModel('globalDate'),
            selectedId = globalDate.get('selectedId');

            this.model.set({
                fromDate: globalDate.get('fromDate'),
                toDate: globalDate.get('toDate'),
                customFromDate: globalDate.get('customFromDate'),
                customToDate: globalDate.get('customToDate'),
                selectedId: globalDate.get('selectedId'),
            });

            var fromDate, toDate;

            if (selectedId === 'all-range-global') {
                fromDate = globalDate.get('firstEventDate');
                toDate = globalDate.get('lastEventDate');
            } else {
                fromDate = globalDate.get('fromDate');
                toDate = globalDate.get('toDate');
            }

            if (fromDate !== undefined && fromDate !== null) {
                this.$('#custom-date-from-global').datepicker('update', fromDate);
            }
            if (toDate !== undefined && toDate !== null) {
                this.$('#custom-date-to-global').datepicker('update', toDate);
            }

            this.$el.find('button').removeClass('active-range');
            if (selectedId !== 'custom-range-apply-global') {
                this.$el.find('#' + selectedId).addClass('active-range');
            }

            if (fromDate !== undefined && fromDate !== null && toDate !== undefined && toDate !== null) {
                ADK.Messaging.trigger('resetDateSliderPosition', {from: moment(fromDate).valueOf(), to: moment(toDate).valueOf()});
            }
        },
        onRender: function(event) {
            this.$('#filter-from-date-global, #filter-to-date-global').inputmask('m/d/y', {
                'placeholder': 'MM/DD/YYYY'
            });
            this.enableDatePickers();
            this.resetToCurrentGlbalDate();
            this.$el.find('#filter-from-date-global, #filter-to-date-global').on('blur', function() {
                $('.input-group.date#custom-date-from-global').datepicker('hide');
            });
            this.trendHistoryChart.show(new TrendHistoryView());
        },
        onBeforeDestroy: function() {
            ADK.Messaging.off('updateGlobalTimelineDateRange');
            ADK.Messaging.off('globalDate:customAllDateRangeDefined');
        }
    });

    return FilterDateRangeView;
}
