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
    
    app.Label = Backbone.Model.extend({
        defauls: {
            text: "",
        },
        mutators: {
            value: function(){
                return this.id;
            }
        }
    });
    app.LabelList = Backbone.Collection.extend({
        model: app.Label,
        localStorage: new Backbone.LocalStorage('LabelList.FotoMemo'),
    });
    
    app.Entry = Backbone.Model.extend({
        defaults: {
            url: "./image/noimage.png",
            savedTime: new Date(),
            comment: "",
            label: null,
            completed: false,
            deleted: false
        },
        mutators: {
            savedTime: function(){
                return $.mobiscroll.formatDate(dateFormat, new Date(this.attributes.savedTime));
            },
            labelText: function(){
                if (!this.attributes.label) return "(None)"
                else return this.attributes.label.text;
            },
            labelId: function(){
                if (!this.attributes.label) return ""
                else return this.attributes.label.id;
            }
        },
        hasLabel: function(label){
            if (this.attributes.label && label) {
                return this.attributes.label.id == label.id;
            }
            else {
                return false;
            }
        }
    });
    app.EntryList = Backbone.Collection.extend({
        model: app.Entry,
        localStorage: new Backbone.LocalStorage('EntryList.FotoMemo'),
        removeDeletedItems: function(){
            $.each(this.where({deleted: true}),function(index, item){
                item.destroy();
            });
        }
    });
    
    app.ListItemView = Marionette.ItemView.extend({
        /*
        model: app.Entry,
        parent: app.EntryListView,
        */
        template: '#entry-item-template',
        ui: {
            item: '.entry-list-item'
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
        collection: app.EntryList,
        */
        el: '#entry-list-container',        
        template: '#entry-list-container',
        childViewContainer: '#entry-list',
        childView: app.ListItemView,
        onBeforeRender: function(){
            if (app.currentLabel) {
                this.filter = function(child, index, collection){
                    return (!child.deleted)
                        && child.hasLabel(app.currentLabel);
                };
            }
            else {
                this.filter = function(child, index, collection){
                    return (!child.deleted) 
                };
            }
        },
        onRender: function(){
            this.initMobiscroll();
            // ↓リストビューをスワイプしたときスライディングメニューが開かないように
            this.$el.on('touchmove', function(e){
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
                    percent: -15, 
                    color: 'crimson', 
                    icon: 'remove', 
                    confirm: true,
                    action: function(item, inst, index) {
                        var selected = self.collection.get({cid: item.attr('cid')});
                        selected.set({deleted: true});
                        inst.remove(item, 'up', function(){
                            var view = self.children.findByModel(selected);
                            view.destroy();
                        });
                        return true;
                    }
                },{
                    percent: 15, 
                    color: 'blue', 
                    icon: 'checkmark', 
                    confirm: true,
                    action: function(item, inst, index) {
                        var selected = self.collection.get({cid: item.attr('cid')});
                        selected.set({completed: true});
                        inst.remove(item, 'up', function(){
                            var view = self.children.findByModel(selected);
                            view.destroy();
                        });
                    }
                }],
                onItemTap: function(item, index, event, inst){
                    app.selected = self.collection.get({cid: item.attr('cid')});
                    mainNavi.pushPage('entry-detail-page');
                }
            });
        },
        filter: function(child, index, collection){
            return child.get('deleted') == false && child.get('completed') == false;
        },
        collectionEvents: {
            'change': function(){
                    console.log("EntryListView.collection.chage");
                }
        }
    });
    
    app.EntryDetailView = Marionette.View.extend({
        /*
        model: app.Entry,
        */
        el: 'ons-page#entry-detail-page',
        ui: {
            imageBox: '#imageBox',
            savedTime: '#savedTime',
            label: '#label'
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
            '#label': {
                observe: 'label',
                update: function($el, val, model, options){
                    $el.mobiscroll('setVal', val.value, true, false, false, 0);
                },
                getVal: function($el, event, options){
                    return app.labels.get({id: $el.mobiscroll('getVal', false, false)});
                }
            },
            '#comment': 'comment'
        },
        initialize: function(){
            $(this.ui.savedTime).mobiscroll().datetime($.extend({
            },dateOption));
            $(this.ui.label).mobiscroll().select($.extend({
                data: app.labels.toJSON()
            },labelOption));
            this.stickit();
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
        },
    });
    $(document).on('pageinit', 'ons-page#entry-detail-page', function(){
        app.entryDetailView = new app.EntryDetailView({
            model: app.selected
        });
        app.entryDetailView.render();
    });
    
    app.MainView = Marionette.View.extend({
        el: 'ons-page#entry-list-page',        
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
                label: app.currentLabel
            });
            console.log(entry);
            app.entries.create(entry);
            app.selected = entry;
            mainNavi.pushPage('entry-detail-page');
        },
        onMenuClick: function(){
            mainMenu.toggleMenu();
        },
    });
    
    app.MenuView = Marionette.View.extend({
        el: '#main-menu',
        initialize: function(){
            this.template = this.$el.html();
        },
        render: function(){
            var template = _.template(this.template.replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
            this.$el.html(template({
                labels: app.labels.toJSON()
            }));
            if (!app.currentLabel) {
                $('#labelAll').attr('checked','checked');
            }
            else if (app.currentLabel == '') {
                $('#labelNone').attr('checked','checked');
            }
            else {
                console.log(app.currentLabel.get('id'));
                $("input[name='labels']").val([app.currentLabel.get('id')]);
            }
            return this;
        },
        events: {
            "click [name='labels']": 'onLabelClick',
            "change [name='labels']": 'onLabelChange',
            'change #labelNone': 'onLabelNoneClick',
            'change #labelAll': 'onLabelAllClick',
            'click #buttonLabelSetting': 'onLabelSettingClick',
            'click #buttonDelete': 'onDeleteClick'
        },
        onLabelClick: function(e){
            mainMenu.closeMenu();
        },
        onLabelChange: function(e){
            app.currentLabel = app.labels.get({id: e.target.value});
            app.entryListView.render();
        },
        onLabelNoneClick: function(){
            app.currentLabel = "";
            app.entryListView.render();
        },
        onLabelAllClick: function(){
            app.currentLabel = null;
            app.entryListView.render();
        },
        onLabelSettingClick: function(){
            mainMenu.closeMenu();
            mainNavi.pushPage('label-list-page');
        },
        onDeleteClick: function(){
            app.entries.removeDeletedItems();
            app.entryListView.render();
        },
    });
    mainMenu.on('preopen', function(){
        console.log("mainMenu.preopen");
        app.mainMenu.render();        
    });
    // ↓詳細ページを表示しているとき画面のスワイプでスライディングメニューが開かないように
    $('ons-page#entry-list-page').styleListener({
        styles: ['display'],
        changed: function(style, newValue, oldValue, element){
            if (style == 'display' && oldValue == 'none'){
                mainMenu.setSwipeable(true);
            }
            else if (style == 'display' && newValue == 'none'){
                mainMenu.setSwipeable(false);
            }
        }
    });
    
    app.LabelItemView = Marionette.ItemView.extend({
        /*
        model: app.Label,
        parent: app.LabelListView,
        */
        template: '#label-item-template',
        ui: {
            item: '.label-list-item'
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
    app.LabelListView = Marionette.CompositeView.extend({
        /*
        collection: app.LabelList,
        */
        el: '#label-list-container',        
        template: '#label-list-container',
        childViewContainer: 'div#label-list',
        childView: app.LabelItemView,
        listContainer: 'ul#label-list',
        onRender: function(){
            this.initMobiscroll();
            // ↓リストビューをスワイプしたときスライディングメニューが開かないように
            this.$el.on('touchmove', function(e){
                e.stopPropagation();
            });
        },
        onAddChild: function(childView){
            childView.parent = this;
        },
        initMobiscroll: function(){
            var self = this;
            $(this.listContainer).mobiscroll().listview({
                theme: 'mobiscroll',
                swipe: false,
                onItemTap: function(item, index, event, inst){
                    if (!item.hasClass('label-list-item')){
                        return false;
                    }
                    console.log("onItemTap");
                    app.selected = self.collection.get({cid: item.attr('cid')});
                    mainNavi.pushPage('label-detail-page');
                }
            });
        },
        events: {
            'click #add-label': 'onAddClick',
        },
        onAddClick: function(e){
            console.log("onAddClick");
            var label = new app.Label({
                text: "Label"
            });
            app.labels.create(label);
            app.selected = label;
            mainNavi.pushPage('label-detail-page');
        },
    });
    $(document).on('pageinit', 'ons-page#label-list-page', function(){
        app.labelListView = new app.LabelListView({
            collection: app.labels
        });
        app.labelListView.render();
    });
    
    app.LabelDetailView = Marionette.View.extend({
        /*
        model: app.Label,
        */
        el: 'ons-page#label-detail-page',
        ui: {
            text: '#text'
        },
        bindings: {
            '#text': 'text'
        },
        initialize: function(){
            this.stickit();
        },
        modelEvents: {
            'change': 'onChange'
        },
        onChange: function(){
            this.model.save();
        },
        events: {
            'click #del-label': 'onDelClick'
        },
        onDelClick: function(){
/*
            ons.notification.confirm({
                message: 'Are you sure?'
                callback: function(index) {
                    // Do something here.
                }
            });
*/
            this.model.destroy();
            mainNavi.popPage();
        }
    });
    $(document).on('pageinit', 'ons-page#label-detail-page', function(){
        app.labelDetailView = new app.LabelDetailView({
            model: app.selected
        });
        app.labelDetailView.render();
    });
    
    app.onStart = function(){        
        app.labels = new app.LabelList({
        });
        app.labels.fetch();
        
        app.currentLabel = app.labels.at(0);

        app.entries = new app.EntryList();
        app.entries.fetch();
        
        app.entryListView = new app.EntryListView({
            collection: app.entries
        });
        app.entryListView.render();

        app.mainView = new app.MainView();
        app.mainMenu = new app.MenuView();
    };
    app.start();
});
