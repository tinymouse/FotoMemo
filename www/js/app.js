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
            completed: false,
            deleted: false
        },
        mutators: {
            savedTime: function(){
                return $.mobiscroll.formatDate(dateFormat, new Date(this.attributes.savedTime));
            },
        },
    });

    app.EntryList = Backbone.Collection.extend({
        model: app.Entry,
        localStorage: new Store('EntryList.FotoMemo'),
        removeDeletedItems: function(){
            $.each(this.where({deleted: true}),function(index, item){
                item.destroy();
            });
        }
    });
    
    app.ListItemView = Marionette.ItemView.extend({
        /*
        model: null,
        parent: null,
        */
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
            this.model.save();
            this.render();
            ons.compile(this.$el.get(0));
            this.parent.initMobiscroll();
        },
    });
    app.EntryListView = Marionette.CompositeView.extend({
        /*
        collection: null,
        */
        el: 'ons-page#list-page',        
        template: 'ons-page#list-page',
        childViewContainer: '#entry-list',
        childView: app.ListItemView,
        onRender: function(){
            this.initMobiscroll();
            // ↓リストビューをスワイプしたときスライディングメニューが開かないように
            $('#list-container').on('touchmove', function(e){
                console.log("#list-container.touchmove");
                e.stopPropagation();
            });
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
                        var selected = self.collection.get({cid: item.attr('cid')});
                        selected.set({deleted: true});
                        /*
                        inst.remove(item);
                        これで消せないので↓
                        */
                        var view = self.children.findByModel(selected);
                        self.removeChildView(view);                        
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
            'click .js-menu': 'onMenuClick',
        },
        onCameraClick: function(e){
            navigator.camera.getPicture(
                this.onCameraSuccess,
                function(){
                    console.log("camera.getPicture.error");
                },{
                    quality: 50,
                    destinationType: Camera.DestinationType.FILE_URI 
                });
        },
        onCameraSuccess: function(uri){
            var entry = new app.Entry({
                url: uri,
                savedTime: new Date(),
            });
            app.selected = entry;
            app.entries.create(entry);
            mainNavi.pushPage('detail-page');
        },
        onMenuClick: function(){
            mainMenu.toggleMenu();
        },
        filter: function(child, index, collection){
            return child.get('deleted') === false;
        },
        collectionEvents: {
            'change': function(){
                    console.log("EntryListView.collection.chage");
                }
        }
    });
    
    app.EntryDetailView = Marionette.View.extend({
        /*
        model: null,
        */
        el: 'ons-page#detail-page',
        ui: {
            imageBox: '#imageBox',
            savedTime: '#savedTime'
        },
        bindings: {
            '#imageBox': {
                observe: 'url',
                update: function($el, val, model, options){
                    var template = _.template($el.get(0).outerHTML.replace('&lt;','<').replace('&gt;','>'));
                    $el.get(0).outerHTML = template({url: val});
                }
            },
            '#savedTime': 'savedTime',
            '#comment': 'comment'
        },
        render: function(){
            this.stickit();
            $(this.ui.savedTime).mobiscroll().datetime($.extend({
                display: 'bottom',
                theme: 'mobiscroll',
            },dateOption));
            return this;
        },
        modelEvents: {
            'change': 'onChange'
        },
        onChange: function(){
            this.model.save();
        },
        events: {
            'click #imageBox': function(){
                    var buf = $(this.ui.imageBox).get(0).outerHTML;
                    alert(buf);
                }
        }
    });
    $(document).on('pageinit', 'ons-page#detail-page', function(){
        app.detailView = new app.EntryDetailView({
            model: app.selected
        });
        app.detailView.render();
    });
    
    app.MenuView = Marionette.View.extend({
        el: '#left-menu',
        events: {
            "click [name='folder']": 'onFolderClick',
            'change #folderInbox': 'onFolderInboxClick',
            'change #folderDeleted': 'onFolderDeletedClick',
            'click #buttonDelete': 'onDeleteClick'
        },
        onFolderClick: function(){
            mainMenu.closeMenu();
        },
        onFolderInboxClick: function(){
            app.listView.filter = function(child, index, collection){
                return child.get('deleted') === false;
            };
            app.listView.render();
        },
        onFolderDeletedClick: function(){
            app.listView.filter = function(child, index, collection){
                return child.get('deleted') === true;
            };
            app.listView.render();
        },
        onDeleteClick: function(){
            console.log("onDelteClick");
            app.entries.removeDeletedItems();
            app.listView.render();
        }
    });
    // ↓詳細ページを表示しているとき画面のスワイプでスライディングメニューが開かないように
    $('ons-page#list-page').styleListener({
        styles: ['display'],
        changed: function(style, newValue, oldValue, element){
            if (style === 'display' && oldValue === 'none'){
                mainMenu.setSwipeable(true);
            }
            else if (style == 'display' && newValue === 'none'){
                mainMenu.setSwipeable(false);
            }
        }
    });
    
    app.onStart = function(){        
        app.entries = new app.EntryList();
        app.entries.fetch();
        app.listView = new app.EntryListView({
            collection: app.entries
        });
        app.listView.initMobiscroll();
        app.listView.render();
        app.mainMenu = new app.MenuView();
    };
    app.start();
});
