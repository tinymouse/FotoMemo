/*
 * Copyright © 2012-2015, Intel Corporation. All rights reserved.
 * Please see the included README.md file for license terms and conditions.
 */


/*jslint browser:true, devel:true, white:true, vars:true */
/*global $:false, intel:false app:false, dev:false, cordova:false */



// This file contains your event handlers, the center of your application.
// NOTE: see app.initEvents() in init-app.js for event handler initialization code.

function myEventHandler() {
    "use strict" ;

    var ua = navigator.userAgent ;
    var str ;

    if( window.Cordova && dev.isDeviceReady.c_cordova_ready__ ) {
            str = "It worked! Cordova device ready detected at " + dev.isDeviceReady.c_cordova_ready__ + " milliseconds!" ;
    }
    else if( window.intel && intel.xdk && dev.isDeviceReady.d_xdk_ready______ ) {
            str = "It worked! Intel XDK device ready detected at " + dev.isDeviceReady.d_xdk_ready______ + " milliseconds!" ;
    }
    else {
        str = "Bad device ready, or none available because we're running in a browser." ;
    }

    alert(str) ;
}


// ...additional event handlers here...

$(function(){
    ons.bootstrap();
    ons.enableAutoStatusBarFill();
});

ons.ready(function(){
    console.clear();
    
    var app = new Marionette.Application();
    
    app.Entry = Backbone.Model.extend({
        defaults: {
            url: "./image/noimage.png",
            savedTime: new Date(),
            comment: "",
        },
        mutators: {
            savedTime: function(){
                return $.mobiscroll.formatDate('yy/mm/dd HH:ii', new Date(this.attributes.savedTime));
            },
        },
    });

    app.EntryList = Backbone.Collection.extend({
        model: app.Entry,
        localStorage: new Store('EntryList.FotoMemo')
    });
    app.entries = new app.EntryList();
    
    app.ListItemView = Marionette.ItemView.extend({
        template: '#entry-item-template',
        ui: {
            item: '.list-item'
        },
        onRender: function(){
            this.ui.item.attr('cid', this.model.cid);
        },
        modelEvents: {
            'change': 'onChange'
        },
        onChange: function(){
            this.render();
            ons.compile(this.$el.get(0));
            this.parent.initMobiscroll();
        },
    });
    app.EntryListView = Marionette.CompositeView.extend({
        el: '#list-page',
        template: '#list-page',
        childViewContainer: '#entry-list',
        childView: app.ListItemView,
        onRender: function(){
            ons.compile($(this.childViewContainer).get(0));
            this.initMobiscroll();
        },
        onAddChild: function(childView){
            childView.parent = this;
        },
        initMobiscroll: function(){
            var self = this;
            $(this.childViewContainer).mobiscroll().listview({
                theme: 'mobiscroll',
                stages: [{ 
                    percent: 15, 
                    color: 'crimson', 
                    icon: 'remove', 
                    confirm: true,
                    action: function(item, inst, index) {
                        self.collection.get({cid: item.attr('cid')}).destroy();
                        return false;
                    }
                }],
                onItemTap: function(item, index, event, inst){
                    app.selected = self.collection.get({cid: item.attr('cid')});
                    mainNavi.pushPage('detail-page');
                }
            });
        },
        events: {
            'click .js-camera': 'onCameraClick',
        },
        onCameraClick: function(e){
            navigator.camera.getPicture(
                this.onPhoto
            ,function(){
                console.log("error");
            },{
                quality: 50,
                destinationType: Camera.DestinationType.FILE_URI 
            });
        },
        onPhoto: function(uri){
            var entry = new app.Entry({
                url: uri,
                savedTime: new Date(),
            });
            app.entries.create(entry);
            app.selected = entry;
            mainNavi.pushPage('detail-page');
        }
    });

    app.EntryDetailView = Marionette.View.extend({
        el: '#detail-page',
        ui: {
            imageBox: '#imageBox',
            savedTime: '#savedTime'
        },
        bindings: {
            '#comment': 'comment',
            '#savedTime': 'savedTime',
            '#imageBox': {
                observe: 'url',
                update: function($el, val, model, options){
                    var template = _.template($el.get(0).outerHTML.replace('&lt;','<').replace('&gt;','>'));
                    $el.get(0).outerHTML = template({url: val});
                }
            }
        },
        render: function(){
            this.stickit();
            $(this.ui.savedTime).mobiscroll().datetime({
                theme: 'mobiscroll',
                lang: 'ja',
                display: 'bottom',
                dateOrder: 'yymmdd',
                dateFormat: 'yy/mm/dd',
                timeFormat: 'HH:ii'
            });
            return this;
        },
        modelEvents: {
            'change': 'onChange'
        },
        onChange: function(){
            this.model.save();
        },
        events: {
            'click #imageBox': 'onImageClick'
        },
        onImageClick: function(){
            var buf = $('#imageBox').get(0).outerHTML;
            alert(buf);
        }
    });
    $(document).on('pageinit', '#detail-page', function(){
        app.detailView = new app.EntryDetailView({
            model: app.selected
        });
        app.detailView.render();
    });
    
    app.onStart = function(){
        app.entries.fetch();
        app.listView = new app.EntryListView({
            collection: app.entries
        });
        app.listView.render();
    };
    app.start();
});
