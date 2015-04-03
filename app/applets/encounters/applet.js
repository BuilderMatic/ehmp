//----------------------------------------
// Name:        Encounters Gist
// Files:       applet.js, appConfig.js GistView.js appUtil.js templets/item.html templets/itemList.html
// Screen:      Overview.js
// Version:     0.9
// Date:        2014-12-17
// Modified:    2015-03-09
// Team:        Jupiter
// Description: Provides gist view (widget) for patient encounters
// 
//----------------------------------------
var dependencies = [
    "underscore",
    "main/ADK",
    "backbone",
    "marionette",
    "crossfilter",
    "app/applets/encounters/GistView",
    "app/applets/encounters/appConfig",
    "app/applets/encounters/appUtil",
    "app/applets/encounters/gistConfig"
];
define(dependencies, onResolveDependencies);

function onResolveDependencies(_, ADK,  Backbone, Marionette, Crossfilter, GistView , CONFIG, util, gistConf ) {
    'use strict';
    // Switch ON/OFF debug info
    var DEBUG = CONFIG.debug;
    // Dimentions for grouping
    var GROUPING = CONFIG.groupBy;
    // Showing configurarion
    var SHOWING = CONFIG.showBy;
    // Top tile ordering & injection
    var TOP_ORDER = CONFIG.eventOrder;  
    if (DEBUG) console.log("EncGist initialization ----->>Start");
    var _super;
    window.tempChartData = []; 
    window.dimentionProp = "";
    window.aggregationScale = "";
    window.subGistViews = {};
    window.filterVal = "";
    var viewParseModel = {
        parse: function(response) {
            if (DEBUG) console.log(response);            
            response.eventDate = util.parseDate(util.getActivityDateTime(response),window.aggregationScale);
            response.showDate = util.displayDate(util.parseDate(util.getActivityDateTime(response)));
            if(util.isAppointment(response)) {
                response.kind = 'Appointment';
                response.custom_filter_field = response.stopCodeName;
            } 
            if(util.isDoDAppointment(response)) {
                response.kind = 'Visit';
                response.stopCodeName = 'UNKNOWN';
                response.custom_filter_field = response.stopCodeName;
            }
            if(util.isDoDEncounter(response)) {
                response.kind = 'Visit';
                response.stopCodeName = 'UNKNOWN';
                response.custom_filter_field = response.stopCodeName;
            }
            if(util.isProcedure(response)) {
                response.custom_filter_field = response.facilityName;
            }
            if(util.isAdmission(response)) {
                response.custom_filter_field = response.locationDisplayName+" - "+response.facilityName;
            }            
            if(util.isVisit(response)){
               if(_.isUndefined(response.stopCodeName)){
                    response.stopCodeName = 'UNKNOWN';
                }
                response.custom_filter_field = response.stopCodeName;
            }
            if (DEBUG) console.log(response);
            return response;
        }
    };
    var AggregationFunctions = {
        // Aggregation sub functions
        dimentionByDateTime: function(d){ return d.dateTime ;}, 
        prepareChartData: function(p, n) { window.tempChartData.push({dateTime: p.eventDate });}, 
        orderValue: function (p) {return p.key;},    
        zeroFilter: function(v){return v.value > 0;},
        subGrouping: function(d) { 
                          if (DEBUG) console.log(window.dimentionProp);
                          return d[window.dimentionProp];
                      },
        dateTimeSort: function(d) { return d.dateTime; },
        timeSort: function(d) { return d.sort_time; },
        showDateSort: function(x) {return x.dateTime.value;},
        filterSubItems: function(y) {return y[window.dimentionProp] === window.filterVal;},
        changeDateFormat: function(p,n){p.showDate = moment(p.showDate, 'YYYY-MM-DD').format('MM/DD/YYYY'); }
    };
    function collectionAggregator(coll, isFiltering) { //coll,resp
                if (DEBUG) console.log("EncGist ----->> preare collection (grouping)");
                // Clear collection from wrong Appointments (the same as Visits)
                // var iDup = util.filterAppointments(coll);
                // if (DEBUG) console.log("Appointments vs. Visits duplications ------->>" + iDup);
                var arrData =  coll.toJSON();
                var FirstEventForPatient = "";
                if(arrData.length>0){
                    if(typeof arrData[0].dateTime !== "undefined"){
                        FirstEventForPatient = (_.sortBy(arrData,AggregationFunctions.dateTimeSort)).slice(0,1)[0].dateTime;
                    }
                }
                if (DEBUG) console.log("First Event for Patient  ------->>" + FirstEventForPatient);
                var encounters = new Crossfilter(arrData);
                coll.reset();
                // Collection oredering by order field
                coll.comparator = 'order';
                var encEventCF = null;
                var encEventCFdimByDate = null;
                var dimByKind = encounters.dimension(function(d) { return d.kind; }); 
                if (DEBUG) console.log("EncGist ----->> crossfilter.size = "+ encounters.size() );
                if (DEBUG) console.log("EncGist ----->> number of types = "+ dimByKind.group().size() );
                var result = {};
                var dimKind = {};
                var dimTime = {};
                var groupingDim = {};
                var showingDim = {};
                var k,z,x =0;
                var showResult = {};
                var showTitles = {};
                var arrShowResult =[];
                var arrSubType = [];
                var arrSortByTime = [];
                var pointer; 
                var Node = Backbone.Collection.extend();
                var encountersByKindAgrigated =dimByKind.group().all();
                if (DEBUG) console.log(JSON.stringify(encountersByKindAgrigated));  // groups by type and count it 
                for(var i=0;i<encountersByKindAgrigated.length;i++){
                    arrSortByTime = [];
                    result = {kind:"",elKind:"",count:"",
                              firstEvent: util.selectStartStopPoint(FirstEventForPatient).start,
                              lastEvent:"",
                              timeSinceLast:"",
                              chartData:[],
                              firstEventDisplay: "",
                              lastEventDisplay: "",
                              maxChart: util.selectStartStopPoint(FirstEventForPatient).stop,  // max chart date, depends on GDF
                              processed: true, order: 0 };
                    result.kind = encountersByKindAgrigated[i].key;
                    result.elKind = util.clanUpItem(result.kind); // kind as name of chart container, delete space,/,\ from kind 
                    result.count = encountersByKindAgrigated[i].value;                     
                    dimKind = dimByKind.filterExact(result.kind);
                    //console.log(dim.top(Infinity));
                    window.tempChartData = []; // reset temp data array
                    if(TOP_ORDER[result.kind.toLowerCase()]){
                        if(TOP_ORDER[result.kind.toLowerCase()].sort_direction === "future"){
                            arrSortByTime = _.sortBy(dimKind.top(Infinity),AggregationFunctions.dateTimeSort);
                        }else{
                            arrSortByTime = _.sortBy(dimKind.top(Infinity),AggregationFunctions.dateTimeSort).reverse();
                        }
                    }else{
                        arrSortByTime = _.sortBy(dimKind.top(Infinity),AggregationFunctions.dateTimeSort).reverse();
                    }
                    dimKind.top(Infinity).forEach(AggregationFunctions.prepareChartData); // dateTime array preparation by event type
                    encEventCF = new Crossfilter(window.tempChartData);
                    encEventCFdimByDate = encEventCF.dimension(AggregationFunctions.dimentionByDateTime);
                    if (DEBUG) console.log("EncGist ----->> temp crossfilter.size = "+ encEventCF.size() );
                    dimTime = encEventCFdimByDate.group().order(AggregationFunctions.orderValue).all();
                    //if (DEBUG) console.log(dimTime);
                    //console.log(arrSortByTime[0].dateTime);
                    //console.log(arrSortByTime[arrSortByTime.length-1].dateTime);                                     
                    // result.firstEvent = FirstEventForPatient ;//arrSortByTime[arrSortByTime.length-1].dateTime; 
                    result.lastEvent  = arrSortByTime[0].dateTime; 
                    result.firstEventDisplay = util.displayDate(result.firstEvent); 
                    result.lastEventDisplay  = util.displayDate(result.lastEvent);  
                    //result.timeSinceLast = util.setTimeSince(result.lastEvent);
                    result.timeSinceLast = ADK.utils.getTimeSince(arrSortByTime[0].dateTime).timeSince;                    
                    arrSortByTime.forEach(AggregationFunctions.changeDateFormat);
                    result.recent = arrSortByTime.slice(0,5);//recent 5 events for 1st level of gist 
                    result.chartData  = dimTime;                   
                    // Top tile sorting by predefined order
                    if(TOP_ORDER[result.kind.toLowerCase()]){
                        result.order = TOP_ORDER[result.kind.toLowerCase()].order;
                    }
                    //--------------------------------
                    if (DEBUG) console.log(result.kind.toLowerCase()); //GROUPING[result.kind.toLowerCase()]
                    // Grouping (second level of gist)----------------------------------------
                    groupingDim = {};
                     if(GROUPING[result.kind.toLowerCase()]){
                          window.dimentionProp = GROUPING[result.kind.toLowerCase()].grouping[0].field;
                         groupingDim = encounters.dimension(AggregationFunctions.subGrouping);
                         result[result.kind.toLowerCase()] = true;
                         var group = groupingDim.group().top(Infinity);
                         result.grouping  = {title: GROUPING[result.kind.toLowerCase()].grouping[0].title,
                                             group: _.filter(group, AggregationFunctions.zeroFilter)};
                         // Age calculation, data preparation
                         var subListRecent = [];
                         var subListDimByDate = {};
                         for(x=0;x<result.grouping.group.length;x++){
                             // Age calculation -------------------------- 
                             arrSubType = [];
                            // arrSubType = groupingDim.filterExact(result.grouping.group[x].key).top(result.grouping.group[x].value); 
                             window.filterVal = result.grouping.group[x].key;                            
                             arrSubType = _.filter(groupingDim.top(Infinity),AggregationFunctions.filterSubItems);                             
                             subListRecent = [];
                             if(arrSubType.length>0){
                                 if(!_.isUndefined(GROUPING[result.kind.toLowerCase()].sort_direction)){ // different sorting order for past and future events
                                    if(GROUPING[result.kind.toLowerCase()].sort_direction === "future"){
                                        subListRecent  = _.sortBy(arrSubType,AggregationFunctions.dateTimeSort);
                                    }else{
                                        subListRecent  = _.sortBy(arrSubType,AggregationFunctions.dateTimeSort).reverse();
                                    }
                                 }else{
                                    subListRecent  = _.sortBy(arrSubType,AggregationFunctions.dateTimeSort).reverse();
                                 }
                                result.grouping.group[x].time = ADK.utils.getTimeSince(subListRecent[0].dateTime).timeSince;//util.displayDate(subListRecent[0].dateTime);
                                result.grouping.group[x].sort_time = subListRecent[0].dateTime; 
                             }
                             // Data preparation -------------------------------------------
                             result.grouping.group[x].kind = result.kind;
                             result.grouping.group[x].elKind = result.elKind;
                             result.grouping.group[x].subKind = result.grouping.group[x].key.trim() !== "" ? result.grouping.group[x].key : "UNKNOWN";
                             result.grouping.group[x].elSubKind = util.clanUpItem(result.grouping.group[x].subKind);// .replace(/[\s\\/()!?*&:;,.^%]/g, '');
                             result.grouping.group[x].count = result.grouping.group[x].value;
                             result.grouping.group[x].recent = subListRecent.slice(0,5); //recent 5 events by subtype
                             //result.grouping.group[x].recent.forEach(AggregationFunctions.changeDateFormat); 
                             result.grouping.group[x].processed = true;
                             result.grouping.group[x][result.kind.toLowerCase()] = true;
                             result.grouping.group[x].kind = TOP_ORDER[result.kind.toLowerCase()].title;
                             if(DEBUG) console.log("EncGist---secondery level--->"+result.kind+"/"+result.grouping.group[x].key+"-"+result.grouping.group[x].value+"/array elements-"+ arrSubType.length);
                             // Chart data grouping ----------------------------------------
                             window.tempChartData = []; // reset temp data array 
                             arrSubType.forEach(AggregationFunctions.prepareChartData);
                             if(DEBUG) console.log("EncGist---secondery level--->"+result.kind+"/"+result.grouping.group[x].key+"- events:"+window.tempChartData.length);
                             subListDimByDate = new Crossfilter(window.tempChartData);
                             // Chart data for subitem
                             result.grouping.group[x].chartData = (subListDimByDate.dimension(AggregationFunctions.dimentionByDateTime)).group().order(AggregationFunctions.orderValue).all();
                             result.grouping.group[x].firstEvent = util.selectStartStopPoint(FirstEventForPatient).start;//FirstEventForPatient;
                             result.grouping.group[x].maxChart = util.selectStartStopPoint(FirstEventForPatient).stop;                             
                             // Conversion chart data for ADK gist view
                             var series = [];
                             var max =0;
                             var count = 0;
                             result.grouping.group[x].id = "encounters-"+result.grouping.group[x].elKind+"-"+result.grouping.group[x].elSubKind;
                             for(var m=0;m<result.grouping.group[x].chartData.length;m++){
                                    count = result.grouping.group[x].chartData[m].value;
                                    series.push([ util.convertChartDate(result.grouping.group[x].chartData[m].key),
                                                  result.grouping.group[x].chartData[m].value]); //result.grouping.group[x].chartData[m].value  by Howard request 
                                    if(max<count) {max = count;}
                                }
                             result.grouping.group[x].graphData = {series: series,
                                                                   nowMaxCount: max,
                                                                   oldestDate: util.convertChartDate(result.grouping.group[x].firstEvent),
                                                                   newestDate: util.convertChartDate(result.grouping.group[x].maxChart)
                                                                  };
                                                             showResult.allGroupedEncounters = [];
                             //Translation for problemGistView
                             if(!_.isUndefined(GROUPING[result.kind.toLowerCase()].parser)) GROUPING[result.kind.toLowerCase()].parser(result.grouping.group[x]);
                             // Subcollection
                             var arrModels = [];
                                 if(!_.isUndefined(GROUPING[result.kind.toLowerCase()].sort_direction)){ // different sorting order for past and future events
                                    if(GROUPING[result.kind.toLowerCase()].sort_direction === "future"){
                                        arrModels = _.sortBy(result.grouping.group,AggregationFunctions.timeSort);
                                    }else{
                                        arrModels = _.sortBy(result.grouping.group,AggregationFunctions.timeSort).reverse();
                                    }
                                 }else{
                                    arrModels = _.sortBy(result.grouping.group,AggregationFunctions.timeSort).reverse();
                                 }                             
                             arrModels = _.sortBy(result.grouping.group,AggregationFunctions.timeSort).reverse();
                             result.node = new Node({ kind:      result.grouping.group[x].kind,
                                                     collection: new Node(arrModels)});
                             groupingDim.filterAll();
                         }
                         groupingDim.dispose();
                     }
                     //-------------------------------------------------------------
                    // Showing without agregation
                     showingDim = {};
                     var arrShowDateTime =[];
                     if(SHOWING[result.kind.toLowerCase()]){
                      showingDim = dimByKind.filterExact(result.kind).top(Infinity);
                         result[result.kind.toLowerCase()] = true;
                         arrShowResult =[];
                         for(k=0;k<showingDim.length;k++){
                            showResult = {};
                            showTitles = {};
                             for(z=0;z<SHOWING[result.kind.toLowerCase()].showing.length;z++){
                                 pointer = SHOWING[result.kind.toLowerCase()].showing[z];                              
                                 showResult[pointer.field] = showingDim[k][pointer.field];
                                // showTitles[pointer.field] = {title: pointer.title};
                               }
                                // system/special fields
                                showResult.kind = TOP_ORDER[result.kind.toLowerCase()].title;
                                // object for daetail view
                                showResult.recent_model = showingDim[k];
                                // Parser fof shoing by (see appConfig.js)
                                if(!_.isUndefined(SHOWING[result.kind.toLowerCase()].parser)) SHOWING[result.kind.toLowerCase()].parser(showResult);
                                //----------------
                                showResult.elKind = util.clanUpItem(showResult.kind);
                                showResult.id = "encounters-"+showResult.elKind+"-"+Math.round(Math.random()*10000000000);
                                arrShowDateTime =[];
                                arrShowDateTime.push([util.convertChartDate(showResult.dateTime),1]); //.value
                                showResult.graphData = {series: arrShowDateTime,
                                                        nowMaxCount: 0,
                                                        oldestDate: util.convertChartDate(result.firstEventDisplay),
                                                        newestDate: util.convertChartDate(result.maxChart)
                                                  };                             
                                arrShowResult.push(showResult);
                         }
                         result.showingTitles = showTitles;
                         // Sorting by date and formatting
                         result.showing =  _.sortBy(arrShowResult, AggregationFunctions.dateTimeSort).reverse();//arrShowResult; showDateSort
                         // Subcollection
                         result.node = new Node({ kind: TOP_ORDER[result.kind.toLowerCase()].title,
                                                  collection: new Node(result.showing)});         
                     }                    
                    //-------------------------------- 
                    // Sort result by predefined order and change name of tile
                    if(TOP_ORDER[result.kind.toLowerCase()]){
                        result.kind = TOP_ORDER[result.kind.toLowerCase()].title;
                        result.elKind = util.clanUpItem(result.kind);
                    }
                    coll.add(result);
                   if (DEBUG) console.log(result);                    
                    dimKind.filterAll();
                }
                // Add empty top level tiles
                  util.addEmptyTiles(coll,FirstEventForPatient);
                // Clear all dimentions and filters
                arrData = null;
                encEventCF = null;
                encEventCFdimByDate = null;
                dimByKind = null;
                dimKind = null;
                encounters = null;
                if (DEBUG) console.log(coll.toJSON());
                ADK.Messaging.getChannel("encounters_internal").trigger("data_aggregated",coll, isFiltering);
        //}
    }
    function collectionDuplicator(collection){
        var shadowCollection = collection.clone();
        ADK.Messaging.getChannel("encounters_internal").trigger("data_original",shadowCollection);
        collectionAggregator(collection);
    }
    var CollectionHandler = {
        queryCollection: function(obj) {  
         var timeRange =  obj.buildJdsDateFilter('dateTime');   
         this.enCollection = ADK.PatientRecordService.fetchCollection({
                        resourceTitle: 'patient-record-timeline',
                            onSuccess: collectionDuplicator, //collectionAggregator, 
                            pageable: false,
                            filterEnabled: true,
                            viewModel: viewParseModel,
                                cache: false,
                            criteria: {                                                                       
                                filter: 'or(eq(kind, "Visit"),eq(kind, "Admission"),eq(kind, "Procedure"),eq(kind, "DoD Appointment"),eq(kind, "Appointment"),eq(kind, "DoD Encounter")),'+'and('+timeRange+')',
                                order:  'dateTime DESC'
                            }         
         });
            //this.enCollection.on("sync",collectionDuplicator); //collectionAggregator
            return this.enCollection;
        }
    };    

    var GridApplet = ADK.Applets.BaseGridApplet;
    var AppletLayoutView = GridApplet.extend({ 
        initialize: function(options) {
            if (DEBUG) console.log("EncGist initialization ----->>");
            _super = GridApplet.prototype;
            var dataGridOptions = {};
            dataGridOptions.enableModal = true;
            dataGridOptions.filterEnabled = true;
            dataGridOptions.shadowCollection = new Backbone.Collection();
            //dataGridOptions.filterFields = ["kind", "count", "timeSinceLast"];
            var self = this; 
            dataGridOptions.refresh = function(obj){
                CollectionHandler.queryCollection(obj);
            };
            ADK.Messaging.on('globalDate:selected', this.onGlobalDateSelected, this); 
            // Event data_aggregated
            ADK.Messaging.getChannel("encounters_internal").on("data_aggregated", this.onDataAggregated, this);
            ADK.Messaging.getChannel("encounters_internal").on("data_original", this.onDataOriginal, this);            
            // Event filter_collection
            ADK.Messaging.getChannel("encounters_internal").on("filter_collection", this.onFilterCollection, this);
            // Event clear_filter
            ADK.Messaging.getChannel("encounters_internal").on("clear_filter", this.onClearFilter, this); 
            
            if (DEBUG) console.log(ADK.SessionStorage.getModel_SessionStoragePreference('globalDate').get("selectedId"));
            window.aggregationScale = util.setAggregationScale(ADK.SessionStorage.getModel_SessionStoragePreference('globalDate').get("selectedId"));
            this.dataGridOptions = dataGridOptions;
           this.dataGridOptions.collection = new Backbone.Collection();
           CollectionHandler.queryCollection(this);
           // this.dataGridOptions.collection = CollectionHandler.queryCollection(this);
            /*this.dataGridOptions.collection.on("reset", function() {
                if (DEBUG) console.log("EncGist ----->> Collection reset --->> this.dataGridOptions.collection"); 
                if (DEBUG) console.log(this.dataGridOptions.collection);
            },this); */
            this.dataGridOptions.SummaryView = GistView;
            // ----- ADK ---------------------------
            window.appletConfig = options.appletConfig; // app id and app instance id for event gist view (ADK)
           //---------------------------------------

           // request detail view through messaging
           ADK.Messaging.getChannel('enc_detail_v_a').on('detailView', this.showVisitDetail);
           ADK.Messaging.getChannel('enc_detail_p').on('detailView', this.showDocumentDetail);

            _super.initialize.apply(this, arguments);           
        },

        onGlobalDateSelected: function(dateModel) {
            if(DEBUG) console.log(JSON.stringify(dateModel));
            this.loading();               
            window.aggregationScale = util.setAggregationScale(dateModel.get("selectedId"));
            CollectionHandler.queryCollection(this);
        },

        onDataAggregated: function(result, isFiltering){
            if (DEBUG) console.log("EncGist data ----->> aggregated");
            if (DEBUG) console.log(result);
            var silentReset = !isFiltering;
             // reset JDS filter criteria for collection !!!
            // if(!_.isUndefined(result.fetchOptions))  this.dataGridOptions.collection.fetchOptions.criteria.filter = result.fetchOptions.criteria.filter;
             this.dataGridOptions.collection.reset(result.models, { silent: silentReset });//, {reindex: true});

            if(this.gridContainer !== undefined){
            // set encounters applet view
             // this.gridContainer.show(this.dataGridView, {preventDestroy: true});
             this.gridContainer.show(this.dataGridView, {preventDestroy: true});
            } else{
             //this.setAppletView();                   
             this.dataGridView = new this.dataGridOptions.SummaryView(this.dataGridOptions);                    
            }
        },

        onDataOriginal: function(result){
            if (DEBUG) console.log("EncGist data ----->> clone");
            if (DEBUG) console.log(result);
             this.dataGridOptions.shadowCollection.reset(result.models);//, {reindex: true});
        },

        onFilterCollection: function(search){
            if (DEBUG) console.log("EncGist filter ----->> custom filter");
            if (DEBUG) console.log(search);
             var filtered = this.dataGridOptions.shadowCollection.filter( function(item){
                   return search.test(item.get("custom_filter_field")); 
             });
            var filteredCollection = new Backbone.Collection();
            collectionAggregator(filteredCollection.reset(filtered), true);
        },

        onClearFilter: function(){
            if (DEBUG) console.log("EncGist filter ----->> clear_filter");
            var originalCollection = new Backbone.Collection();
            collectionAggregator(originalCollection.reset(this.dataGridOptions.shadowCollection.models), true);
        },

        showVisitDetail: function(params) {
            if(DEBUG) console.log("detailView --->>");
            util.showDetailView(params,"visitDetail");
        },

        showDocumentDetail: function(params) {
            if(DEBUG) console.log("detailView --->>");
            util.showDetailView(params,"documents");
        },

        onRender: function() {
            _super.onRender.apply(this, arguments);
        },

        onBeforeDestroy: function() {
            ADK.Messaging.off('globalDate:selected', this.onGlobalDateSelected, this);

            var internalChannel = ADK.Messaging.getChannel("encounters_internal");
            internalChannel.off("data_aggregated", this.onDataAggregated, this);
            internalChannel.off("data_original", this.onDataOriginal, this);
            internalChannel.off("filter_collection", this.onFilterCollection, this);
            internalChannel.off("clear_filter", this.onClearFilter, this);

            ADK.Messaging.getChannel('enc_detail_v_a').off('detailView', this.showVisitDetail);
            ADK.Messaging.getChannel('enc_detail_p').off('detailView', this.showDocumentDetail);

            if (typeof _super.onBeforeDestroy === 'function') {
                _super.onBeforeDestroy.apply(this, this.arguments);
            }
        }
    });

    var applet = {
        id: "encounters",
        hasCSS: true, //Should only be true if the applet has its own styles.css file
        viewTypes: [{
            type: 'gist',
            view: AppletLayoutView,
            chromeEnabled: true
        }],
        defaultViewType: 'gist'
    };
    return applet;
}