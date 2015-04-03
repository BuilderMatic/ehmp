var dependencies = [
    'main/ADK',
    'backbone',
    'marionette',
    'underscore',
    'main/components/global_datepicker/util/chartHelper',
    'main/components/global_datepicker/util/chartStyling',
    'main/components/global_datepicker/util/parseEvents',
    'hbs!main/components/global_datepicker/template/spikeLineTemplate',
    'api/SessionStorage',
    'moment'
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(ADK, Backbone, Marionette, _, ChartHelper, ChartStyling, parseEvents, spikeLineTemplate, SessionStorage, moment) {
    'use strict';

    var fetchOptions = {
        resourceTitle: 'global-timeline-getTimeline',
        pageable: false,
        cache: true,
        viewModel: {
            parse: parseEvents
        }
    };
    var chart;
    var maxBarLength;

    var spikeLineChartOptions = $.extend(true, {}, ChartHelper.chartConfig, ChartStyling.spikeLineChartStyles);
    var response = $.Deferred();

    return Backbone.Marionette.ItemView.extend({
        template: spikeLineTemplate,
        initialize: function() {

            var self = this;

            ADK.Messaging.on('globalDate:selected', function(dateModel) {
                var from = moment(dateModel.get('customFromDate')).valueOf();
                var to;

                if (dateModel.get('selectedId') === 'all-range-global') {
                    to = moment(chart.xAxis[0].getExtremes().dataMax).valueOf();
                } else {
                    to = moment(dateModel.get('customToDate')).valueOf();
                }

                if (from === null || from === undefined || _.isNaN(from) || $.trim(from) === '') {
                    from = moment(chart.xAxis[0].getExtremes().dataMin).valueOf();
                }

                self.updateBarWidth(from, to);

                chart.xAxis[0].setExtremes(from, to);
            });

            fetchOptions.onSuccess = function(collection) {
                self.displayCharts(collection);
            };
            ADK.PatientRecordService.fetchCollection(fetchOptions);
        },
        displayCharts: function(mockCollection) {

            spikeLineChartOptions.series[0].data = this.buildOutpatientArray(mockCollection);
            spikeLineChartOptions.series[1].data = this.buildInpatientArray(mockCollection);

            var self = this;

            var interval = setInterval(function() {
                if (self.$('#spikeLineChartContainer')) {
                    clearInterval(interval);
                    interval = 0;
                    spikeLineChartOptions.chart.renderTo = self.$('#spikeLineChartContainer')[0];
                    chart = new Highcharts.Chart(spikeLineChartOptions, self.spikelineEventsChartCallback);
                    self.drawAndZoom();
                }
            }, 500);
        },
        spikelineEventsChartCallback: function(spikeLine) {
            Highcharts.addEvent(spikeLine.container, 'click', function(e) {
                $('#gdr-spikeline').trigger('click');
            });
        },
        buildOutpatientArray: function(mockCollection) {
            var outpatientArray = [];

            var model = mockCollection.at(0);
            var oup = model.get('outpatient');

            oup = this.groupPatientsByTimeSlice(oup);

            _.each(oup, function(value, key) {
                var dateTime = key + '';
                var num = value.length;

                if(dateTime.length > 6){
                    dateTime = dateTime.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                    outpatientArray.push([moment(dateTime, 'YYYY-MM-DD').valueOf(), num]);
                }
                else{
                    dateTime = dateTime.replace(/(\d{4})(\d{2})/, '$1-$2');
                    outpatientArray.push([moment(dateTime, 'YYYY-MM').valueOf(), num]);
                }
            });
            return outpatientArray;
        },
        buildInpatientArray: function(mockCollection) {
            var inpatientArray = [];

            var model = mockCollection.at(0);
            var inp = model.get('inpatient');

            inp = this.groupPatientsByTimeSlice(inp);

            _.each(inp, function(value, key) {
                var dateTime = key + '';
                var num = value.length;

                if(dateTime.length > 6){
                    dateTime = dateTime.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                    inpatientArray.push([moment(dateTime,'YYYY-MM-DD').valueOf(), num]);
                }
                else{
                    dateTime = dateTime.replace(/(\d{4})(\d{2})/, '$1-$2');
                    inpatientArray.push([moment(dateTime,'YYYY-MM').valueOf(), num]);
                }
            });
                return inpatientArray;

        },
        groupPatientsByTimeSlice: function(patients) {
            return _.groupBy(patients, function(patient) {
                var time = patient.dateTime + '';
                time = time.slice(0, 8);
                var year = parseInt(time.slice(0, 4), 10);
                var month = parseInt(time.slice(4, 6), 10);
                var day = parseInt(time.slice(6, 8), 10);
                if (moment([year, month-1, day]).diff(moment(), 'days') >= 0){
                    // 1-7: (month) 7
                    // 8-14: (month) 14
                    // 15-21: (month) 21
                    // 22-31: (month+1) 1

                    if (day >= 1 && day <= 7){
                        day = 7;
                    }
                    else if(day >= 8 && day <= 14){
                        day = 14;
                    }
                    else if (day >= 15 && day <= 21){
                        day = 21;
                    }
                    else if (day >= 22){
                        day = 1;
                        month = month + 1;
                    }

                    if (day < 10) {
                        day = '0' + day;
                    } else {
                        day = '' + day;
                    }

                    if (month < 10) {
                        month = '0' + month;
                    } else {
                        month = '' + month;
                    }

                    return (year + '' + month + '' + day);
                }
                else{
                    var quarterlyBinning = (Math.floor((month + 2) / 3) * 3) - 2;
                    if ((quarterlyBinning) < 10) {
                        quarterlyBinning = '0' + quarterlyBinning;
                    } else {
                        quarterlyBinning = '' + quarterlyBinning;
                    }
                    var timeSlice = time.slice(0, 4) + '' + quarterlyBinning;
                    return timeSlice;
                }
            });
        },
        updateBarWidth: function(from, to) {
            var dateRangeInDays = moment(to).diff(moment(from), 'days');
            var calculatedBarSize = 8 - Math.floor(dateRangeInDays / 1500);
            if (calculatedBarSize < 1) {
                calculatedBarSize = 1;
            }

            chart.series[0].update({
                pointWidth: calculatedBarSize
            });
            chart.series[1].update({
                pointWidth: calculatedBarSize
            });
        },
        drawAndZoom: function() {
            var globalDate = SessionStorage.getModel('globalDate');
            var fromDate, toDate;

            if (globalDate.get('selectedId') !== undefined && globalDate.get('selectedId') !== null) {
                fromDate = globalDate.get('customFromDate');
                toDate = globalDate.get('customToDate');
            }

            if (fromDate === null || fromDate === undefined || $.trim(fromDate) === '') {
                fromDate = '01/01/1900';
            }

            this.updateBarWidth(fromDate, toDate);
            chart.xAxis[0].setExtremes(moment(fromDate).valueOf(), moment(toDate).valueOf());
        },
        onBeforeDestroy: function() {
            this.destroySpikeChart();
            ADK.Messaging.off('globalDate:selected');
        },
        destroySpikeChart: function() {
            if (chart !== undefined && chart !== null) {
                chart.destroy();
                chart = undefined;
            }
        },
    });
}