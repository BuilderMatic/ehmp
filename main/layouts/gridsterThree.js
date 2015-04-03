var dependencies = [
    "backbone",
    "marionette",
    "underscore",
    "hbs!main/layouts/templates/gridsterThree"
];

define(dependencies, onResolveDependencies);

// todo: CSS needs a lot of work to display the applet height correctly
// todo: decide how we want to size them and add responsiveness
// todo: refreshing page disables drag and drop functionality until resize or reroute (maximize applet)

function onResolveDependencies(Backbone, Marionette, _, Template) {
    layoutView = Backbone.Marionette.LayoutView.extend({
        template: Template,
        regions: {
            left: "#left",
            center: "#center",
            right: "#right",
            left2: "#left2",
            center2: "#center2",
            right2: "#right2",
            left3: "#left3",
            center3: "#center3",
            right3: "#right3",
            left4: "#left4",
            center4: "#center4",
            right4: "#right4"
        },
        className: "contentPadding",
        //onRender: function() {
        //    console.log('intitializing gridster');
        //    var gridster = this.$el.find('.gridster ul').gridster({
        //        widget_margins: [0, 0],
        //        widget_base_dimensions: [400, 200],
        //        resize: {
        //            enabled: true
        //        },
        //        draggable: {
        //            enabled: false
        //        }
        //    }).data('gridster');
        //    gridster.enable();
        //}
        onDomRefresh: function() {
            var gridster;

            gridster = $(".gridster").gridster({
                widget_selector: "div",
                avoid_overlapped_widgets: true,
                widget_margins: [3, 20],
                widget_base_dimensions: [400, 200],
                resize: {
                    enabled: true
                },
                draggable: {
                    handle: "span.center-block.text-center.panel-title"
                }
            }).data('gridster');
        }
    });

    return layoutView;
}
