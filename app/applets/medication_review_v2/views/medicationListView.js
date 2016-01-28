define(["jquery","underscore","backbone","hbs!app/applets/medication_review_v2/templates/medicationsListLayout","hbs!app/applets/medication_review_v2/templates/medicationsListItem","app/applets/medication_review_v2/views/medicationDetailView","app/applets/medication_review_v2/charts/chartBuilder","app/applets/medication_review_v2/charts/chartConfig"],function(e,t,i,s,a,o,n,l){"use strict";function d(){return"medication_review_v2"}var r=null,h=i.Marionette.LayoutView.extend({template:a,className:"medsItem item",chartPointer:null,events:{'click [data-toggle="collapse"]':function(e){e.stopImmediatePropagation()},"click .medsItemInner":function(t){var i=this.$el.find(".medicationReviewDetail"),s=e(".medicationReviewDetail.collapse.in"),a=s.not(i);a.collapse("toggle")},"click .clickDetail":function(e){this.showDetail()}},initialize:function(e){var t=this.model.get("uid").replace(/[:|.]/g,"_");this.$el.attr("id","medication_Item_"+this.model.get("id")),this.model.set("id",t),this.model.set("applet_id",e.AppletID),this.model.set("medicationClass",e.medicationClass),"inpatient"===this.model.get("medicationClass").toLowerCase()&&this.model.set("inpatient",!0),void 0!==this.model.get("subMedsInternalGroupModels").models[0]?this.model.set("graphInfoText",this.model.get("subMedsInternalGroupModels").models[0].get("graphInfoText")):(this.model.set("emptySubMedsInternalGroupModels",!0),this.model.get("subMedsInternalGroupModels").reset(new i.Model({isFirstOverlappingMed:!0,firstFacilityMed:new i.Model({displayName:this.model.get("displayName"),badDataFound:!0})}))),this.initialized=!1;var s=this;void 0!==this.model.get("subMedsInternalGroupModels").models[0]&&this.model.get("subMedsInternalGroupModels").models[0].get("ariaLabelAdditionalText")&&this.model.set("ariaLabelAdditionalText",this.model.get("subMedsInternalGroupModels").models[0].get("ariaLabelAdditionalText")),this.model.set("overlappingMeds",this.model.get("subMedsInternalGroupModels").models),this.listenTo(ADK.Messaging.getChannel(e.AppletID),"detailView",function(e){if(e.uid===s.model.get("uid")){var t=s.$el.find('[data-toggle="collapse"]').find(".collapse");t.collapse("toggle")}}),this.model&&(this.detailView=new o({model:this.model}))},regions:function(e){var t="#detail_Area_"+e.model.get("uid").replace(/[:|.]/g,"_"),i={detailRegion:t};return i},onDomRefresh:function(){this.model;this.model.get("lastChildInCollection")&&!e('[fistMedsReviewAccordionGroup="true"]').hasClass("finishedRender")&&(e('[fistMedsReviewAccordionGroup="true"]').click(),e('[fistMedsReviewAccordionGroup="true"]').addClass("finishedRender"),this.initialized=!0)},onBeforeDestroy:function(){var e=this.model;"undefined"!=typeof this.$el.find("#chart_"+e.get("id")).highcharts()&&this.$el.find("#chart_"+e.get("id")).highcharts().destroy(),this.toolbar&&this.toolbar.destroy()},onRender:function(){if(this.toolbar=new ADK.Views.ToolbarView({targetElement:this.$el.find(".medsItemInner"),buttonTypes:["infobutton","detailsviewbutton"],appletID:this.options.AppletID,model:this.model}),"I"===s||"V"===s)this.$el.find(".highcharts-container").hide();else if(!this.model.get("emptySubMedsInternalGroupModels")){var e=this.model,t=new n(e),i=new l(t),s=this.model.get("vaType");this.$el.find("#chart_"+e.get("id")).highcharts(i)}},showDetail:function(){this.detailView&&this.showChildView("detailRegion",this.detailView)}}),c=i.Marionette.CompositeView.extend({template:s,childView:h,className:"panel panel-default medsReviewMainGroup",emptyView:i.Marionette.ItemView.extend({template:t.template('<div class="emptyMedsList">No Records Found</div>')}),events:{"show.bs.collapse .mainAccordionPanel":"onExpandGroup","shown.bs.collapse .mainAccordionPanel":"reflowHChart","hide.bs.collapse .mainAccordionPanel":"onCollapseGroup","hidden.bs.collapse .mainAccordionPanel":"reflowHChart","focus .mainAccordion":function(t){var i=e(t.target);i.keypress(function(e){(13===e.which||32===e.which)&&i.click()})},"click .header":function(t){t.preventDefault(),t.stopImmediatePropagation(),this.sortCollection(e(t.target))},"focus .header":function(t){t.preventDefault(),t.stopImmediatePropagation();var i=e(t.target),s=this;i.keypress(function(e){(13===e.which||32===e.which)&&s.sortCollection(i)})}},onDomRefresh:function(){this.reflowHChart(),this.model.get("expandOnInitialRender")&&0===this.model.get("meds").models.length&&(e('[fistMedsReviewAccordionGroup="true"]').click(),e('[fistMedsReviewAccordionGroup="true"]').addClass("finishedRender"))},onRender:function(){if(!t.isUndefined(this.model.get("meds").models[0])){var i=this.model.get("medicationClass")+"-graph-header",s=this.model.get("meds").models[0].get("graphRelativeityOldestTime"),a=this.model.get("meds").models[0].get("graphRelativeityNewestTime"),o=this.model.get("meds").models[0].get("vaType");"I"!==o&&"V"!==o&&(this.headerChartConfig=new l({chart:{height:20},name:"headerChart",xAxis:{min:s,max:a,labels:{enabled:!0},tickColor:"$grey-dark",tickLength:12,tickWidth:2,tickPosition:"outside"},yAxis:{categories:[{categories:["headerChart"]}]},series:[{pointRange:6e4,data:[{height:1,x:s,x2:a,y:0}]}]}),this.headerChartPointer=e("#"+i),this.$el.find("#"+this.model.get("medicationClass")+"-graph-header").highcharts(this.headerChartConfig))}},onBeforeDestroy:function(){var e=this.$el.find("#"+this.model.get("medicationClass")+"-graph-header");"undefined"!=typeof e.highcharts()&&e.highcharts().destroy()},reflowHChart:function(){var i=this;this.model.get("hasEmptyView")||e('[medsItemChart="true"]').each(function(){if(!t.isUndefined(e(this).highcharts())){var s="#"+i.model.get("medicationClass")+"-graph-header",a=e(s),o=e(this).highcharts().chartHeight,n=a.width();e(this).highcharts().setSize(n,o,!1),e(this).highcharts().reflow()}})},onExpandGroup:function(t){if(e(t.target).hasClass("mainAccordionPanel")){var i=this.$el.find(".mainAccordionIndicator");i.removeClass("fa-caret-right"),i.addClass("fa-caret-down")}},onCollapseGroup:function(t){if(e(t.target).hasClass("mainAccordionPanel")){var i=this.$el.find(".mainAccordionIndicator");i.removeClass("fa-caret-down"),i.addClass("fa-caret-right")}},initialize:function(e){this._super=i.Marionette.CompositeView.prototype,r=d(e),this.childViewOptions={AppletID:r,medicationClass:this.model.get("type"),chartHeaderID:"#"+this.model.get("type").toUpperCase()+"-graph-header"},this.model.get("expandOnInitialRender")&&this.model.get("meds").models.length>0&&this.model.get("meds").models[this.model.get("meds").models.length-1].set("lastChildInCollection",!0),this.collection=this.model.get("meds"),"inpatient"===this.model.get("type").toLowerCase()&&this.model.set("inpatient",!0),this.model.set("id",r),this.model.set("medicationClass",this.model.get("type").toUpperCase()),this.$el.attr("id","medsReviewMainGroup_"+this.model.get("medicationClass")),this.childViewContainer="#"+r+"-medication-list-items",0===this.collection.models.length&&(this.model.set("hasEmptyView",!0),this.childViewContainer="#"+r+"-medication-list-items"),this.statusFillableSortFunction=function(e,t){var i=function(e){var t=e.get("fillsRemaining"),i=e.get("standardizedVaStatus").toLowerCase(),s=e.get("fillableStatus");return"expired"===i&&"Non VA"!==s?6:"active"===i&&0===t&&"Non VA"!==s?5:"active"===i&&t>0&&"Non VA"!==s?4:"pending"===i?3:"Non VA"===s?2:"discontinued"===i?1:0},s=i(e),a=i(t);if(s>a)return-1;if(a>s)return 1;var o=s,n=e.get("displayName").toLowerCase(),l=t.get("displayName").toLowerCase(),d=moment(e.get("stopped"),"YYYYMMDDHHmm").valueOf(),r=moment(t.get("stopped"),"YYYYMMDDHHmm").valueOf(),h=e.get("fillableDays"),c=t.get("fillableDays");return 6===o||1===o?r>d?-1:d>r?1:0:5===o||3===o?l>n?-1:n>l?1:0:4===o?h.days<c.days?-1:h.days>c.days?1:0:0===o?0:void 0},this.statusNextSortFunction=function(e,t){var i=function(e){var t=(e.get("nextInpatientAdminText"),e.get("standardizedVaStatus").toLowerCase());e.get("fillableStatus");return"active"===t?4:"pending"===t?3:"expired"===t?2:"discontinued"===t?1:0},s=i(e),a=i(t);if(s>a)return-1;if(a>s)return 1;var o=s,n=e.get("displayName").toLowerCase(),l=t.get("displayName").toLowerCase(),d=moment(e.get("stopped"),"YYYYMMDDHHmm").valueOf(),r=moment(t.get("stopped"),"YYYYMMDDHHmm").valueOf(),h=e.get("nextAdminData").display,c=t.get("nextAdminData").display;return 2===o||1===o?r>d?-1:d>r?1:0:3===o?l>n?-1:n>l?1:0:4===o?c>h?-1:h>c?1:0:0===o?0:void 0},this.statusNextOrStatusFillableSort=this.statusFillableSortFunction,this.model.get("inpatient")===!0&&(this.statusNextOrStatusFillableSort=this.statusNextSortFunction),this._super.initialize.apply(this,arguments)},toggleMainAccordion:function(){var e=this.$el.find(".mainAccordionIndicator");e.hasClass("fa-caret-right")?(e.removeClass("fa-caret-right"),e.addClass("fa-caret-down")):(e.removeClass("fa-caret-down"),e.addClass("fa-caret-right"))},sortCollection:function(e){if(this.collection.comparator=null,"true"===e.attr("sortable")){var t="";switch(e.attr("sortDirection")){case"asc":t="desc";break;case"desc":t="none";break;case"none":t="asc"}if(this.$el.find(".header").attr("sortDirection","none"),e.attr("sortDirection",t),this.$el.find(".header").find("[sortArrow=headerDirectionalIndicator]").removeClass("fa-caret-up"),this.$el.find(".header").find("[sortArrow=headerDirectionalIndicator]").removeClass("fa-caret-down"),"asc"===t?e.find("[sortArrow=headerDirectionalIndicator]").addClass("fa-caret-up"):"desc"===t&&e.find("[sortArrow=headerDirectionalIndicator]").addClass("fa-caret-down"),"none"===t)ADK.utils.CollectionTools.resetSort(this.collection);else{var i=e.attr("sortType"),s=e.attr("sortKey");ADK.utils.CollectionTools.sort(this.collection,s,t,i,this.statusNextOrStatusFillableSort)}}this.reflowHChart()}});return c});