import React from "react";
import PropTypes from "prop-types";
import videojs from "video.js";
import { myPromise } from "../utils/utils";
import { configs } from "../utils/constants";

import "../libs/libpannellum.js";
import "../libs/pannellum.js";
import "../libs/videojs-pannellum-plugin.js";
import "../css/pannellum.css";
import "../css/video-js.css";

let myPannellum = null;

class ReactPannellum extends React.Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
    sceneId: PropTypes.string.isRequired,
    children: PropTypes.any,
    type: PropTypes.string,
    imageSource: PropTypes.string,
    equirectangularOptions: PropTypes.shape({}),
    cubeMap: PropTypes.arrayOf(PropTypes.string),
    multiRes: PropTypes.shape({
      basePath: PropTypes.string,
      path: PropTypes.string,
      fallbackPath: PropTypes.string,
      extension: PropTypes.string,
      tileResolution: PropTypes.number,
      maxLevel: PropTypes.number,
      cubeResolution: PropTypes.number,
    }),
    config: PropTypes.shape({}),
    className: PropTypes.string,
    style: PropTypes.shape({}),
    onPanoramaLoaded: PropTypes.func,
  };

  static defaultProps = {
    type: "equirectangular",
    imageSource: "",
    equirectangularOptions: {},
    cubeMap: [],
    multiRes: {},
    className: "",
    style: configs.styles,
    config: {},
  };

  state = {
    imageSource: "",
    equirectangularOptions: {},
    cubeMap: [],
    multiRes: {},
    isVideo: false
  };

  init = () => {
    const { sceneId } = this.props;

    const pannellumConfig = this.initPannellumConfig(sceneId);

    this.video = videojs(this.videoNode, {
      plugins: {
        pannellum: pannellumConfig 
      }
    });

    myPannellum = this.video.pnlmViewer;
    myPannellum.on("scenechange", this.sceneChangeHandler);

    if(pannellumConfig.scenes[sceneId].dynamic) {
      this.video.src({ type: 'video/mp4', src: pannellumConfig.scenes[pannellumConfig.default.firstScene].imageSource }); //TODO: Put correct extension
      this.video.play();
    } else {
      // Override options
      //let currentConf = myPannellum.getConfig();
      //currentConf.dynamic = false;
      //currentConf.panorama = pannellumConfig.scenes[sceneId].panorama;
      myPannellum.on("load", this.sceneLoadedHandler);
      myPannellum.loadScene(sceneId);
    }
    this.props.onPanoramaLoaded && myPannellum.on("load", () => this.props.onPanoramaLoaded());
  };

  initPannellumConfig(sceneId) {
    let { config, type } = this.props;
    config.scenes = config.scenes || [];
    const {
      equirectangularOptions,
      cubeMap,
      multiRes,
      imageSource
    } = this.state;
    const source = config.scenes[sceneId] ? config.scenes[sceneId].imageSource || imageSource : imageSource;
    const isVideo = ReactPannellum.isPathVideo(source);
    return {
      dynamic: isVideo,
      default: {
        firstScene: sceneId,
      },
      scenes: {
        ...config.scenes,
        [sceneId]: {
          ...configs.panoramaConfigs,
          ...configs.equirectangularOptions,
          ...configs.uiText,
          ...config,
          type,
          ...equirectangularOptions,
          imageSource: source,
          panorama: isVideo ? undefined : source,
          cubeMap,
          multiRes,
          dynamic: isVideo
        },
      },
    }
  }

  initPanalleum() {
    const {
      imageSource,
      type,
      cubeMap,
      multiRes,
      equirectangularOptions,
    } = this.props;

    this.setState({
      isVideo: ReactPannellum.isPathVideo(imageSource)
    });

    switch (type) {
      case "equirectangular":
        this.setState(
          {
            imageSource,
            equirectangularOptions,
            cubeMap: [],
          },
          () => this.init()
        );
        break;
      case "cubemap":
        this.setState(
          {
            cubeMap,
            imageSource: "",
          },
          () => this.init()
        );
        break;
      case "multires":
        this.setState(
          {
            cubeMap: [],
            imageSource: "",
            multiRes,
          },
          () => this.init()
        );
        break;
      default:
        break;
    }
  }

  sceneChangeHandler = (e) => {
    console.log("Changing scene: ", e);

    const config = myPannellum.getConfig();
    const isNextSceneVideo = ReactPannellum.isPathVideo(config.scenes[e].imageSource);
    
    config.dynamic = isNextSceneVideo;
    config.panorama = isNextSceneVideo ? config.panorama : config.scenes[e].panorama; //TODO: Use video node?
    myPannellum.setUpdate(isNextSceneVideo);
    myPannellum.getContainer().style.visibility = isNextSceneVideo ? 'hidden' : 'visible';

    this.setState({ isVideo: isNextSceneVideo});
  }
  
  sceneLoadedHandler = (e) => {
    console.log("Loaded: ", e);
  }

  componentDidMount() {
    this.initPanalleum();
  }

  componentWillUnmount() {
    myPannellum && this.props.onPanoramaLoaded && myPannellum.off("load", this.props.onPanoramaLoaded);
    if(this.player)
      this.player.dispose();
  }

  static isLoaded() {
    return myPannellum && myPannellum.isLoaded();
  }

  static getPitch() {
    return myPannellum && myPannellum.getPitch();
  }

  static setPitch(pitch, animated = 1000, callback, callbackArgs) {
    if (myPannellum) {
      myPannellum.setPitch(pitch, animated, callback, callbackArgs);
    }
  }

  static getPitchBounds() {
    return myPannellum && myPannellum.getPitchBounds();
  }

  static setPitchBounds(bounds) {
    if (myPannellum) {
      myPannellum.setPitchBounds(bounds);
    }
  }

  static getYaw() {
    return myPannellum && myPannellum.getYaw();
  }

  static setYaw(yaw, animated = 1000, callback, callbackArgs) {
    if (myPannellum) {
      myPannellum.setYaw(yaw, animated, callback, callbackArgs);
    }
  }

  static getYawBounds() {
    return myPannellum && myPannellum.getYawBounds();
  }

  static setYawBounds(bounds) {
    myPromise(myPannellum, { bounds })
      .then(({ bounds }) => {
        myPannellum.setYawBounds(bounds);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  static getHfov() {
    return myPannellum && myPannellum.getHfov();
  }

  static setHfov(hfov, animated = 1000, callback, callbackArgs) {
    if (myPannellum) {
      myPannellum.setHfov(hfov, animated, callback, callbackArgs);
    }
  }

  static getHfovBounds() {
    return myPannellum && myPannellum.getHfovBounds();
  }

  static setHfovBounds(bounds) {
    myPromise(myPannellum, { bounds })
      .then(({ bounds }) => {
        myPannellum.setHfovBounds(bounds);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  static lookAt(pitch, yaw, hfov, animated = 1000, callback, callbackArgs) {
    if (myPannellum) {
      myPannellum.lookAt(pitch, yaw, hfov, animated, callback, callbackArgs);
    }
  }

  static getNorthOffset() {
    return myPannellum && myPannellum.getNorthOffset();
  }

  static setNorthOffset(heading) {
    myPromise(myPannellum, { heading })
      .then(({ heading }) => {
        myPannellum.setNorthOffset(heading);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  static getHorizonRoll() {
    return myPannellum && myPannellum.getHorizonRoll();
  }

  static setHorizonRoll(roll) {
    myPromise(myPannellum, { roll })
      .then(({ roll }) => {
        myPannellum.setHorizonRoll(roll);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  static getHorizonPitch() {
    return myPannellum && myPannellum.getHorizonPitch();
  }

  static setHorizonPitch(pitch) {
    myPromise(myPannellum, { pitch })
      .then(({ pitch }) => {
        myPannellum.setHorizonPitch(pitch);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  static startAutoRotate(speed, pitch) {
    myPromise(myPannellum, { pitch })
      .then(({ pitch }) => {
        myPannellum.startAutoRotate(speed, pitch);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  static stopAutoRotate() {
    if (myPannellum) {
      myPannellum.stopAutoRotate();
    }
  }

  static mouseEventToCoords(event) {
    return myPannellum && myPannellum.mouseEventToCoords(event);
  }

  static addScene(sceneId, config, callback) {
    if (sceneId && sceneId !== "" && config && config !== {}) {
      myPromise(myPannellum, { sceneId, config, callback })
        .then(({ sceneId, config, callback }) => {
          myPannellum.addScene(sceneId, config);
          callback && callback();
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      console.log(
        "sceneId cannot be empty and config.imageSource cannot be empty!!"
      );
    }
  }

  static getCurrentScene() {
    return myPannellum && myPannellum.getScene();
  }

  static getAllScenes() {
    return myPannellum && myPannellum.getAllScenes();
  }

  static removeScene(sceneId, callback) {
    if (sceneId && sceneId !== "") {
      myPromise(myPannellum, { sceneId })
        .then(({ sceneId }) => {
          myPannellum.removeScene(sceneId);
          callback && callback();
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      console.log("sceneId cannot be empty");
    }
  }

  static loadScene(sceneId, targetPitch, targetYaw, targetHfov, fadeDone) {
    if (myPannellum && sceneId && sceneId !== "") {
      myPannellum.loadScene(
        sceneId,
        targetPitch,
        targetYaw,
        targetHfov,
        fadeDone
      );
    }
  }

  static toggleFullscreen() {
    return myPannellum && myPannellum.toggleFullscreen();
  }

  static getConfig() {
    return myPannellum && myPannellum.getConfig();
  }

  static getContainer() {
    return myPannellum && myPannellum.getContainer();
  }

  static addHotSpot(hotspot, sceneId) {
    if (hotspot !== {}) {
      myPromise(myPannellum, { hotspot, sceneId })
        .then(({ hotspot, sceneId }) => {
          myPannellum.addHotSpot(hotspot, sceneId);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      console.log(
        "hotspot cannot be empty, please check hotspot elements needed in document: config props `hotSpots`."
      );
    }
  }

  static removeHotSpot(hotSpotId, sceneId) {
    if (hotSpotId !== "") {
      myPromise(myPannellum, { hotSpotId, sceneId })
        .then(({ hotSpotId, sceneId }) => {
          myPannellum.removeHotSpot(hotSpotId, sceneId);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      console.log("hotspotId cannot be empty!!");
    }
  }

  static destroy() {
    return myPannellum && myPannellum.destroy();
  }

  static stopMovement() {
    return myPannellum && myPannellum.stopMovement();
  }

  static resize() {
    return myPannellum && myPannellum.resize();
  }

  static isOrientationSupported() {
    return myPannellum && myPannellum.isOrientationSupported();
  }

  static stopOrientation() {
    return myPannellum && myPannellum.stopOrientation();
  }

  static startOrientation() {
    return myPannellum && myPannellum.startOrientation();
  }

  static isOrientationActive() {
    return myPannellum && myPannellum.isOrientationActive();
  }

  static getViewer() {
    return myPannellum;
  }

  static isPathVideo(path) {
    return /\.(webm|mp4)$/.test(path); //TODO: Validate video formats
  }

  render() {
    const { style, className, id, children } = this.props;
    return (
      <div data-vjs-player>
        <video
          id={id}
          ref={node => this.videoNode = node}
          className={"video-js vjs-default-skin vjs-big-play-centered " + className}
          preload="auto"
          muted={true}
          autoPlay={true}
          loop
          crossOrigin="anonymous"
          style={style} />
      </div>
    );
  }
}

export default ReactPannellum;
