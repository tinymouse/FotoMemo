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
            name: "",
        },
        mutators: {
            value: function(){
                return this.id;
            }
        },
    });
    app.LabelList = Backbone.Collection.extend({
        model: app.Label,
        localStorage: new Backbone.LocalStorage('LabelList.FotoMemo'),
    });
    app.labels = new app.LabelList();
    
    app.emptyLabel = new app.Label($.extend({
        id: "99999999-9999-9999-9999-999999999999"
    },emptyLabelOption));
        
    app.currentLabel = null;

    app.Entry = Backbone.Model.extend({
        defaults: {
            url: "./image/noimage.png",
            savedTime: new Date(),
            comment: "",
            label: {},
            completed: false,
            deleted: false
        },
        mutators: {
            savedTime: function(){
                return $.mobiscroll.formatDate(dateFormat, new Date(this.attributes.savedTime));
            },
            labelName: function(){
                return (this.attributes.label ? this.attributes.label.name : app.emptyLabel.attributes.name);
            },
        },
        hasLabel: function(label){
            return (this.attributes.label ? this.attributes.label.id : app.emptyLabel.id) == 
                (label ? label.id : app.emptyLabel.id);
        },
        refreshLabel: function(label){
            if (!this.attributes.label || !label) {
                return;
            }
            if (this.attributes.label.id == label.id) {
                this.set('label', label.clone());
                this.save();
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
    app.entries = new app.EntryList();
    
    app.showCompleted = false;
    
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
            this.filter = function(child, index, collection){
                return !child.attributes.deleted &&
                    (app.showCompleted ? true : !child.attributes.completed) &&
                    (app.currentLabel ? child.hasLabel(app.currentLabel) : true);
            };
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
            return !child.attributes.deleted && !child.attributes.completed;
        },
        collectionEvents: {
            'change': 'onChange'
        },
        onChange: function(){
            this.children.each(function(view){
                if (app.currentLabel && !view.model.hasLabel(app.currentLabel)) {
                    view.destroy();
                }              
            });
        }
    });
    app.entryListView = new app.EntryListView({
        collection: app.entries
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
                    $el.mobiscroll('setVal', (val.value ? val.value : app.emptyLabel.id), true, false, false, 0);
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
                data: app.labels.toJSON(),
                placeholder: app.emptyLabel.attributes.name
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
    $(document).on('prepop', 'ons-page#entry-detail-page', function(){
        if (app.entryDetailView){
            app.entryDetailView.destroy();
        }
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
            });
            entry.set('label', app.currentLabel ? app.currentLabel.clone() : app.emptyLabel.clone());
            app.entries.create(entry);
            app.selected = entry;
            mainNavi.pushPage('entry-detail-page');
        },
        onMenuClick: function(){
            mainMenu.toggleMenu();
        },
    });
    app.mainView = new app.MainView();
    
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
            $('#labelNone').attr('value',app.emptyLabel.id);
            if (app.currentLabel) {
                $("input[name='labels']").val([app.currentLabel.id]);
            }
            else {
                $('#labelAll').attr('checked','checked');
            }
            $('#showCompleted').prop('checked', app.showCompleted);
            return this;
        },
        events: {
            "click .js-close": 'onCloseClick',
            'change #labelAll': 'onLabelAllClick',
            'change #labelNone': 'onLabelNoneClick',
            "change [name='labels']:not(#labelNone,#labelAll)": 'onLabelChange',
            'click #showCompleted': 'onShowCompletedClick',
            'click #configLabel': 'onConfigLabelClick',
            'click #removeDeleted': 'onRemoveDeletedClick',
        },
        onCloseClick: function(e){
            mainMenu.closeMenu();
        },
        onLabelAllClick: function(){
            app.currentLabel = null; 
            app.entryListView.render();
        },
        onLabelNoneClick: function(){
            app.currentLabel = app.emptyLabel; 
            app.entryListView.render();
        },
        onLabelChange: function(e){
            app.currentLabel = app.labels.get({id: e.target.value}); 
            app.entryListView.render();
        },
        onShowCompletedClick: function(){
            app.showCompleted = $('#showCompleted').prop('checked');
            app.entryListView.render();
        },
        onConfigLabelClick: function(){
            mainNavi.pushPage('label-list-page');
        },
        onDeleteClick: function(){
            app.entries.removeDeletedItems();
            app.entryListView.render();
        },
    });
    mainMenu.on('preopen', function(){
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
    app.mainMenu = new app.MenuView();
    
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
                    if (item.hasClass('label-list-item')){
                        app.selected = self.collection.get({cid: item.attr('cid')});
                        mainNavi.pushPage('label-detail-page');
                    }
                    else if (item.hasClass('js-add')){
                        self.onAddClick(event);
                    }
                }
            });
        },
        onAddClick: function(e){
            var label = new app.Label({
                name: "Label "
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
    $(document).on('prepop', 'ons-page#label-list-page', function(){
        if (app.labelListlView){
            app.labelListView.destroy();
        }
    });
    
    app.LabelDetailView = Marionette.View.extend({
        /*
        model: app.Label,
        */
        el: 'ons-page#label-detail-page',
        ui: {
            name: '#name'
        },
        bindings: {
            '#name': 'name'
        },
        initialize: function(){
            this.stickit();
        },
        modelEvents: {
            'change': 'onChange'
        },
        onChange: function(){
            this.model.save();
            var label = this.model;
            app.entries.each(function(entry){
                entry.refreshLabel(label);
            });
        },
        events: {
            'click .js-del': 'onDelClick'
        },
        onDelClick: function(){
            var self = this;
            ons.createAlertDialog('confirm-delete-label-dialog').then(function(dialog) {
                dialog.on('postshow', function(e) {
                    $('.js-yes').click(function(){
                        self.doDelete();
                    });
                    $('.js-close').click(function(){
                        e.alertDialog.destroy();
                    });
                });
                dialog.show();
            });
        },
        doDelete: function(){
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
    $(document).on('prepop', 'ons-page#label-detail-page', function(){
        if (app.labelDetailView){
            app.labelDetailView.destroy();
        }
    });

    // ↓$(document).on('postpop', 'xxx-page', function(){...としたいので。'prepop' でなく 'postpop' にしたいが無理なので
    mainNavi.on('prepop', function(e){
        $('ons-page#' + e.currentPage.name).trigger('prepop');
    });
    
    app.onStart = function(){        
        app.labels.fetch();
        app.currentLabel = app.emptyLabel;
        app.entries.fetch();
        app.entryListView.render();
    };
    app.start();
});
