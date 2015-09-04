var CommentsCollection = require("../collections/comments");
var display = require("../util/display");
var eb = require("../eventBus");
// var MetadataQuestionsCollection = require("../collections/metadataQuestions");
// var MetadataQuestionsFilterView = require("../views/metadataQuestionsFilterView");
var PolisStorage = require("../util/polisStorage");
var PolisModelView = require("../lib/PolisModelView");
var popoverEach = require("../util/popoverEach");
var ServerClient = require("../stores/polis");
var TutorialController = require("../controllers/tutorialController");
var VotesCollection = require("../collections/votes");
var URLs = require("../util/url");
var Utils = require("../util/utils");
var preloadHelper = require("../util/preloadHelper");

var urlPrefix = URLs.urlPrefix;

module.exports = PolisModelView.extend({

  selectedGid: -1,

  groupInfo: function() {
    return this.serverClient.getGroupInfo(this.selectedGid);
  },

  updateVotesByMeCollection: function(isFirstFetch) {
    console.log("votesByMe.fetch");
    if (Utils.isDemoMode()) {
      return;
    }
    if (isFirstFetch) {
      preloadHelper.firstVotesByMePromise.then(function(votes) {
        this.votesByMe.add(votes);
      }.bind(this));
    } else {
      this.votesByMe.fetch({
        data: $.param({
          conversation_id: this.conversation_id,
          pid: "mypid",
        }),
        reset: false
      });
    }
  },


  allowMetadataFiltering: function() {
    return true;
  },

  emphasizeParticipants: function() {
  },


  destroyPopovers: function() {
    popoverEach("destroy");
  },
  onClusterTapped : function(gid) {
    this.selectedGid = gid;

    this.destroyPopovers();
    var that = this;
      // if (window.isMobile()) {
      //    window.scrollTo(0, $("#visualization_div").offset().top);
      // }
  },

  initialize: function(options) {
    // init this pronto so we can load the votes view asap
    this.votesByMe = new VotesCollection();
    PolisModelView.prototype.initialize.apply(this, arguments);
    var that = this;
    var conversation_id = this.conversation_id = this.model.get("conversation_id");
    var zinvite = this.zinvite = this.model.get("zinvite");

    this.tutorialController = new TutorialController();

    this.allCommentsCollection = new CommentsCollection();
    this.allCommentsCollection.firstFetchPromise = $.Deferred();


    eb.on(eb.clusterSelectionChanged, function(gid) {
      that.selectedGid = gid;
    });

    // var metadataCollection = new MetadataQuestionsCollection([], {
    //     conversation_id: conversation_id
    // });

    // metadataCollection.fetch({
    //   data: $.param({
    //     conversation_id: conversation_id
    //   }),
    //   processData: true
    // });

    var getPtptoiLimit = function() {
      return display.xs() ? 12 : void 0;
    };

    var serverClient = that.serverClient = new ServerClient({
      conversation_id: conversation_id,
      zinvite: zinvite,
      tokenStore: PolisStorage.token,
      getPtptoiLimit: getPtptoiLimit,
      votesByMe: this.votesByMe,
      //commentsStore: PolisStorage.comments,
      //reactionsByMeStore: PolisStorage.reactionsByMe,
      utils: window.utils,
      logger: console
    });

    this.updateVotesByMeCollection(1);
    this.serverClient.addPollingScheduledCallback(function() {
      that.updateVotesByMeCollection();
    });
    this.serverClient.startPolling();


    this.allCommentsCollection.fetch = this.allCommentsCollection.doFetch = function(o) {
      var thatCollection = this;
      var params = {
        gid: o.gid,
        conversation_id: conversation_id
      };
      var promise = Backbone.Collection.prototype.fetch.call(this, {
        data: $.param(params),
        processData: true,
        silent: true,
        ajax: function() {
          return that.serverClient.getFancyComments(params);
        }
      });
      promise.then(this.firstFetchPromise.resolve);
      promise.then(function() {
        thatCollection.trigger("reset");
      });
      return promise;
    };




      //  // CHILD VIEWS

      // this.metadataQuestionsView = this.addChild(new MetadataQuestionsFilterView({
      //   serverClient: serverClient,
      //   conversation_id: conversation_id,
      //   collection: metadataCollection
      // }));

      //  // LISTEN TO EVENTS

      // this.listenTo(this.metadataQuestionsView, "answersSelected", function(enabledAnswers) {
      //   if (that.allowMetadataFiltering()) {
      //     console.log(enabledAnswers);
      //     serverClient.queryParticipantsByMetadata(enabledAnswers).then(
      //       that.emphasizeParticipants.bind(that),
      //       function(err) {
      //         console.error(err);
      //       });
      //   }
      // });

      // Clicking on the background dismisses the popovers.
      this.$el.on("click", function() {
        that.destroyPopovers();
      });


  }
});