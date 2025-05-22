import * as React from "react";
import {
  Platform,
  Text,
  View,
  ActivityIndicator,
  Button,
  TouchableOpacity,
  Image,
  DeviceEventEmitter,
  Linking,
  Alert,
} from "react-native";
import styles from "./style";
import { Helpers, Images, Metrics } from "../../Theme";
import { strings } from "../../Assets/Locales/i18n";
import LinearGradient from "react-native-linear-gradient";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import * as NavigationService from "../../Services/NavigationService";
import { any } from "prop-types";
import { apiService } from "../../Services/ApiService";
import { Endpoint, BaseUrl } from "../../Services/Endpoint";
import { Marker } from "react-native-maps";
// import Geolocation from '@react-native-community/geolocation';
import {
  getData,
  LocalDBItems,
  storeData,
  wipeData,
} from "../../Services/LocalStorage";
import Loader from "../../Components/Loader";
import textDis from "../../Components/ErrorAlertPopup"
import moment from "moment";
import GeoCoder from "../../Components/GeoCoder";
import LocationFetcher from "../LocationModule/index";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import IconImage from "react-native-vector-icons/FontAwesome";
import Icons from "react-native-vector-icons/MaterialIcons";
import Toast from "react-native-simple-toast";
import CustomModal from "../../Components/CustomModal";
import CustomPopUp from "../../Components/CustomRadiusDropDownPopUp";
import AlertPopup from "../../Components/AlertPopup";
import ErrorAlertPopup from "../../Components/ErrorAlertPopup";
import UUIDGenerator from "react-native-uuid-generator";
import haversine from "haversine";
import ViewLiveTrackingScreen from "../Home/ViewLiveTracking";
import Geolocation, {
  GeoPosition,
  SuccessCallback,
  ErrorCallback,
  GeoError,
} from "react-native-geolocation-service";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;
const LATITUDE = 29.95539;
const LONGITUDE = 78.07513;
var counter = 0;
var checkout_counter =0;

export default class HomeScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      points: 200,
      timer_error: true,
      progressBarPercentage: 0,
      checkInData: null,
      breakInData: null,
      isPaused: false,
      isBreak: false,
      isStarted: false,
      loading: false,
      stopWatchCounter: "00:00",
      stopWatchCounterBreakIn: "00:00",
      inSeconds: 0,
      currentDate: moment(new Date()).format("MM/DD/YYYY hh:mm:ss A"),
      intervalId: 0,
      locationDetails: null,
      isInRadiusModalShow: false,
      showAlertPopup: false,
      isForceCheckoutPopUp:false,
      isCheckOutPopup: false,
      locationFetcherNeeded: false,
      showLiveTrackingButton: false,
      getGroupMembersList: [],
      isGroupCheckIn: false,
      isDisabled: true,
      groupMemeber: {},
      groupMemberInfoArray: [],
      showTrackingModal: false,
      in_latitude :0,
      in_longitude :0 
    };
    this.parentRef = React.createRef();
    this.previousTimeStamp = new Date();
    this.locationInfoArray = [];
    this.isWorkEnded = false;
    this.isCheckinForLocation = false;
    this.isInitalLoad = true;

    this.intervalId = any;
    this.employeeDetails = {};
    this.timerCheckIn = null;
    this.timerBreakIn = null;
    this.timerStopCounter = 0;
    this.showTimerForAutoCheckOut = null;
    (this.timerStopForBreakCounter = 0),
      (this.cordinateObj = {
        latitude: 25.2048,
        longitude: 55.2708,
      }),
      (this.geoCoder = new GeoCoder());
    this.currentLocationObj = {
      formatted_address: "",
      street_number: "",
      country: "",
      administrative_area_level_1: "",
      administrative_area_level_2: "",
      locality: "",
      route: "",
      postal_code: "",
      latitude: 0.0,
      longitude: 0.0,
    };
    (this.previousTimeStamp = new Date()),
      (this.groupUUID = null),
      (this.isTripEnd = false),
      (this.checkInDataValue = null);
    this.isCheckinAdmin = null;
  }
  /**
   * Get employee details from the store
   * Get last check in details by employee ID
   */
  async componentDidMount() {
    this.getEmployeeDetails();
    this.location_feching();
    this.lastCheckinByEmpID(true);
    this.geoCoder.initiaLizeGeoCoder();
    this._unsubscribe = this.props.navigation.addListener("blur", () => {
      if (this.locationFetcher != null) {
      }
      this.state.locationFetcherNeeded = false;
    });
    this._unsubscribe = this.props.navigation.addListener("focus", () => {
      this.setState({ locationFetcherNeeded: true }, () => {
        this.isInitalLoad = false;
      });
    });
   this.getLocationTrackingNeeded()
  }
   getLocationTrackingNeeded = async() => {
    let isLiveTracking = await getData(LocalDBItems.isLocationTrackingNeeded)
        if (isLiveTracking) {
          this.setState({ showLiveTrackingButton: true });
        } else {
          this.setState({ showLiveTrackingButton: false });
        }
   }
  componentWillUnmount() {
    clearInterval(this.timerCheckIn);
    clearInterval(this.timerBreakIn);
  }


  getdata = async () => {
    try {
      const value = await AsyncStorage.getItem("newNameKey")
      if( value!=null){
        console.log (value);
        const employeeDetails = await getData(LocalDBItems.employeeDetails);
        const params = {
          org_id : employeeDetails.org_id,
          eventName : value,
          emp_id :  employeeDetails.id,
          emp_Name : employeeDetails.full_name,
          createdDate: moment(new Date()).utc(true).format("DD/MM/YYYY hh:mm a"),
          modifiedDate:moment(new Date()).utc(true).format("DD/MM/YYYY hh:mm a"),
        };
        const requestObj = {
          endpoint: BaseUrl.API_BASE_URL + Endpoint.ADD_FORCE_TIMESHEET_CHECKIN,
          type: "post",
          params: params,
        };
        const apiResponseData = await apiService(requestObj);
        if (apiResponseData.status == "200") {
          if (this.timer != null) {
            clearInterval(this.timer);
          }
        }
        clearInterval(this.timerCheckIn);
        clearInterval(this.timerBreakIn);
        clearInterval(this.showTimerForAutoCheckOut);
        this.timerStopCounter = 0;
        this.timerStopForBreakCounter = 0;
        this.setState({
          breakInData: null,
          checkInData: null,
          isStarted: false,
          isBreak: false,
          stopWatchCounter: "00:00",
          stopWatchCounterBreakIn: "00:00",
          loading: false,
          progressBarPercentage: 0,
          showAlertPopup: false,
          isCheckOutPopup: false,
        });
        console.log(params);
        this.forceCheckOut();
        const full_name = `${employeeDetails.full_name} Force checked Out successfully`;
        Toast.show(full_name,Toast.LONG);
      }
    } catch (error) {
      console.log("Errorgetdata")
    }
  }
  /**
   * After face verification, user navigates to home screen and need to refresh with check in data
   */
  refresh = async () => {
    const employeeDetails = await getData(LocalDBItems.employeeDetails);
    const full_name = `${employeeDetails.full_name} checked in successfully`;
    Toast.show(full_name, Toast.LONG);
    let isFetchedGeoCorderObj = await this.fetchGeocoderObject();
    if (!isFetchedGeoCorderObj) {
     // Toast.show("Unbale to fetcth geo locationinfo", Toast.LONG);
    }
    this.lastCheckinByEmpID(true);
    let isTracking = await getData(LocalDBItems.isLocationTrackingNeeded);
    if (isTracking) {
      await storeData(LocalDBItems.isLocationTrackingNeeded, false);
      this.isTripEnd = true;
      await this.locationTrackingNewApi(null, this.isTripEnd);
      await this.resetTracking();
    }
  };

  onGoBackToPreviousCheckOut = async () => {
    counter++;
    console.log(counter);
    this.setState({
      showAlertPopup: false,
      isCheckOutPopup: false,
    });
    // this.props.navigation.goBack();
  } 
  /**
   * Get employee details
   */
  getEmployeeDetails = async () => {
    this.employeeDetails = await getData(LocalDBItems.employeeDetails);
    const userDetails = await getData(LocalDBItems.userDetails);
  };
  /**
   * Navigate to check in screen
   */
  navigateToCheckInScreen = async () => {
    NavigationService.navigate("CheckInScreen", {
      onGoBack: () => this.refresh(),
      locationDetails: this.state.locationDetails,
      cordinateObj: this.cordinateObj,
    });
  };

  location_feching = async () => {
    Geolocation.getCurrentPosition(location_info => console.log("Location--->",location_info));
  }



  forceCheckOut = async (isEndOfWork = false) => {
    console.log('Forcecehckoutfunction')
    console.log('post checkout', this.currentLocationObj)
    this.setState({ loading: true });
    const userId = await getData(LocalDBItems.employeeDetails);
    const checkInDetails = await getData(LocalDBItems.CHECK_IN_OUT_DETAILS)
    let checkIsInRadius = await this.locationFetcher.isLocationInRadius();
    console.log('-----205')
    let params = {
      team_member_empid: this.checkInDataValue.empid,
      groupid: this.checkInDataValue.groupid,
      check_out: moment(new Date()).utc(true).format("DD/MM/YYYY hh:mm a"),
      is_inrange: checkIsInRadius ? checkIsInRadius : false,
      modifiedby: userId.full_name,
      TimesheetCurrentLocationViewModel: {
        formatted_address: this.currentLocationObj.formatted_address,
        lat: this.cordinateObj.latitude,
        lang: this.cordinateObj.longitude,
        street_number: this.currentLocationObj.street_number,
        route: this.currentLocationObj.route,
        locality: this.currentLocationObj.locality,
        administrative_area_level_2: this.currentLocationObj
          .administrative_area_level_2,
        administrative_area_level_1: this.currentLocationObj
          .administrative_area_level_1,
        postal_code: this.currentLocationObj.postal_code,
        country: this.currentLocationObj.country,
      },
    };
    await storeData(LocalDBItems.checkOutLocationInfo, this.currentLocationObj);
  
    const requestObj = {
      endpoint: BaseUrl.API_BASE_URL + Endpoint.TIMESHEET_CHECKOUT,
      type: "post",
      params: params,
    };
    const apiResponseData = await apiService(requestObj);
    setTimeout(() => {
      this.setState({
        loading: false,
      });
  
      /*-- Changing for the stimulation of the error  */ 
      if (apiResponseData.status === "200") {
        if (isEndOfWork) {
          this.timer_error = false;
          this.isWorkEnded = true;
          this.isCheckinForLocation = false;
          storeData(LocalDBItems.isEmployeeLocationTrack, false);
          storeData(LocalDBItems.CHECK_IN_OUT_DETAILS, checkInDetails)
          this.locationFetcher.removeLocationUpdate();
        } else {
          this.startTracking(); //for check out
        }
  }
}, 1000);
};
  /**
   * show popup and checkout modal
   */
  showPopupAndCheckOut = async () => {
    this.setState({ showAlertPopup: true, isCheckOutPopup: true });
  };
  /**
   * This method is to post the checkout
   * @param {bool} isEndOfWork
   */
  postCheckout = async (isEndOfWork = false) => {
    console.log('post checkout', this.currentLocationObj)
    this.setState({ loading: true });
    const userId = await getData(LocalDBItems.employeeDetails);
    const checkInDetails = await getData(LocalDBItems.CHECK_IN_OUT_DETAILS)
    let checkIsInRadius = await this.locationFetcher.isLocationInRadius();
    console.log('-----205')
    let isFetchedGeoCorderObj = await this.fetchGeocoderObject();
    if (!isFetchedGeoCorderObj) {
      if(checkout_counter <2){
      Toast.show("Unable to fetch geo location info", Toast.LONG);
      this.setState({ loading: false , isCheckOutPopup : false , showAlertPopup: false  });
      checkout_counter++;
      console.log("CheckoutCounter",checkout_counter)
      }
      else{
        this.setState({ loading: false , isCheckOutPopup : false , showAlertPopup: false ,isForceCheckoutPopUp : true });
        
      }
    }
    else{
      let params = {
        team_member_empid: this.checkInDataValue.empid,
        groupid: this.checkInDataValue.groupid,
        check_out: moment(new Date()).utc(true).format("DD/MM/YYYY hh:mm a"),
        is_inrange: checkIsInRadius ? checkIsInRadius : false,
        modifiedby: userId.full_name,
        TimesheetCurrentLocationViewModel: {
          formatted_address: this.currentLocationObj.formatted_address,
          lat: this.cordinateObj.latitude,
          lang: this.cordinateObj.longitude,
          street_number: this.currentLocationObj.street_number,
          route: this.currentLocationObj.route,
          locality: this.currentLocationObj.locality,
          administrative_area_level_2: this.currentLocationObj
            .administrative_area_level_2,
          administrative_area_level_1: this.currentLocationObj
            .administrative_area_level_1,
          postal_code: this.currentLocationObj.postal_code,
          country: this.currentLocationObj.country,
        },
      };
      await storeData(LocalDBItems.checkOutLocationInfo, this.currentLocationObj);
    
      const requestObj = {
        endpoint: BaseUrl.API_BASE_URL + Endpoint.TIMESHEET_CHECKOUT,
        type: "post",
        params: params,
      };
      const apiResponseData = await apiService(requestObj);
      setTimeout(() => {
        this.setState({
          loading: false,
        });
    
        /*-- Changing for the stimulation of the error  */ 
        if (apiResponseData.status === "200") {
          if (isEndOfWork) {
            this.timer_error = false;
            this.isWorkEnded = true;
            this.isCheckinForLocation = false;
            storeData(LocalDBItems.isEmployeeLocationTrack, false);
            storeData(LocalDBItems.CHECK_IN_OUT_DETAILS, checkInDetails)
            this.locationFetcher.removeLocationUpdate();
          } else {
            this.startTracking(); //for check out
          }
          clearInterval(this.timerCheckIn);
          clearInterval(this.timerBreakIn);
          clearInterval(this.showTimerForAutoCheckOut);
          this.timerStopCounter = 0;
          this.timerStopForBreakCounter = 0;
          this.setState({
            breakInData: null,
            checkInData: null,
            isStarted: false,
            isBreak: false,
            stopWatchCounter: "00:00",
            stopWatchCounterBreakIn: "00:00",
            loading: false,
            progressBarPercentage: 0,
            showAlertPopup: false,
            isCheckOutPopup: false,
          });
          const full_name = `${userId.full_name}'s Checked Out sucessfully`;
          Toast.show(full_name, Toast.LONG);
          const checkinInfo = { isOfficeChecin: false, isProjectCheckin: false };
          storeData(LocalDBItems.checkInInfo, checkinInfo);
        } 
        else 
        {
          console.log('error', apiResponseData.result.code)
          Toast.show(apiResponseData.result.code || "Something went wrong", Toast.LONG)
          this.setState({loading: false})
        }
      }, 1000);
  }
};


    //   errortimer = async () => {
    //     if(this.timer_error == false)
    //     {
    //     console.log(this.timer_error)
    //     }
    //     else{
    // if(counter < 2)
    // {
    //   {   
    //     this.setState({loading : false});
    //     Alert.alert('Request Timeout','You are Exceeded request timeout please Refresh the page',[
    //       {
    //         text: 'Refresh',
    //         onPress: () => this.onGoBackToPreviousCheckOut(),
    //         style:'cancel'
    //       },]);
    //   }
      
    // }
    // else          
    // {
    //   this.setState({loading : false});
    //   Alert.alert('Request Timeout','You are Exceeded the refresh try Kindly please report the issue',[
    //     {
    //       text: 'Report the problem',
    //       onPress: () => this.submitReport(),
    //       style:'cancel'
    //     },]);
    //   }
    //     }

    // }

// checkoutmodal = async () => {
//   console.log("Exited")
//   let params = {
//     team_member_empid: this.checkInDataValue.empid,
//     groupid: this.checkInDataValue.groupid,
//     check_out: moment(new Date()).utc(true).format("DD/MM/YYYY hh:mm a"),
//     is_inrange: checkIsInRadius ? checkIsInRadius : false,
//     modifiedby: userId.full_name,
//     TimesheetCurrentLocationViewModel: {
//       formatted_address: this.currentLocationObj.formatted_address,
//       lat: this.cordinateObj.latitude,
//       lang: this.cordinateObj.longitude,
//       street_number: this.currentLocationObj.street_number,
//       route: this.currentLocationObj.route,
//       locality: this.currentLocationObj.locality,
//       administrative_area_level_2: this.currentLocationObj
//         .administrative_area_level_2,
//       administrative_area_level_1: this.currentLocationObj
//         .administrative_area_level_1,
//       postal_code: this.currentLocationObj.postal_code,
//       country: this.currentLocationObj.country,
//     },
//   };
//   await storeData(LocalDBItems.checkOutLocationInfo, this.currentLocationObj);

//   const requestObj = {
//     endpoint: BaseUrl.API_BASE_URL + Endpoint.TIMESHEET_CHECKOUT,
//     type: "post",
//     params: params,
//   };
//   const apiResponseData = await apiService(requestObj);
//   setTimeout(() => {
//     this.setState({
//       loading: false,
//     });

//     /*-- Changing for the stimulation of the error  */ 
//     if (apiResponseData.status === "200") {
//       if (isEndOfWork) {
//         this.timer_error = false;
//         this.isWorkEnded = true;
//         this.isCheckinForLocation = false;
//         storeData(LocalDBItems.isEmployeeLocationTrack, false);
//         storeData(LocalDBItems.CHECK_IN_OUT_DETAILS, checkInDetails)
//         this.locationFetcher.removeLocationUpdate();
//       } else {
//         this.startTracking(); //for check out
//       }
//       clearInterval(this.timerCheckIn);
//       clearInterval(this.timerBreakIn);
//       clearInterval(this.showTimerForAutoCheckOut);
//       this.timerStopCounter = 0;
//       this.timerStopForBreakCounter = 0;
//       this.setState({
//         breakInData: null,
//         checkInData: null,
//         isStarted: false,
//         isBreak: false,
//         stopWatchCounter: "00:00",
//         stopWatchCounterBreakIn: "00:00",
//         loading: false,
//         progressBarPercentage: 0,
//         showAlertPopup: false,
//         isCheckOutPopup: false,
//       });
//       const full_name = `${userId.full_name}'s Checked Out sucessfully`;
//       Toast.show(full_name, Toast.LONG);
//       const checkinInfo = { isOfficeChecin: false, isProjectCheckin: false };
//       storeData(LocalDBItems.checkInInfo, checkinInfo);
//     } 
//     else 
//     {
//       console.log('error', apiResponseData.result.code)
//       Toast.show(apiResponseData.result.code || "Something went wrong", Toast.LONG)
//       this.setState({loading: false})
//     }
//   }, 1000);
// }

submitReport = async () => {
    console.log(value)
    const employeeDetails = await getData(LocalDBItems.employeeDetails);
    const params = {
      org_id : employeeDetails.org_id,
      eventName : "Force_checkOut",
      emp_id :  employeeDetails.id,
      emp_Name : employeeDetails.full_name,
      createdDate: moment(new Date()).utc(true).format("DD/MM/YYYY hh:mm a"),
      modifiedDate:moment(new Date()).utc(true).format("DD/MM/YYYY hh:mm a"),
    };
    const requestObj = {
      endpoint: BaseUrl.API_BASE_URL + Endpoint.ADD_FORCE_TIMESHEET_CHECKIN,
      type: "post",
      params: params,
    };
    const apiResponseData = await apiService(requestObj);
    if (apiResponseData.status == "200") {
      if (this.timer != null) {
        clearInterval(this.timer);
      }
    }
    clearInterval(this.timerCheckIn);
    clearInterval(this.timerBreakIn);
    clearInterval(this.showTimerForAutoCheckOut);
    this.timerStopCounter = 0;
    this.timerStopForBreakCounter = 0;
    this.setState({
      breakInData: null,
      checkInData: null,
      isStarted: false,
      isBreak: false,
      stopWatchCounter: "00:00",
      stopWatchCounterBreakIn: "00:00",
      loading: false,
      progressBarPercentage: 0,
      showAlertPopup: false,
      isCheckOutPopup: false,
    });
    console.log(params);
    const full_name = `${employeeDetails.full_name} Force checked Out successfully`;
    Toast.show(full_name,Toast.LONG);
    }

  /**
   * Check the team member is out of the radius
   */
  checkOutOnceTeamMemberAssginedOutOfRadius = async () => {
    this.setState({ loading: true });
    const userId = await getData(LocalDBItems.employeeDetails);
    let checkIsInRadius = await this.locationFetcher.isLocationInRadius();
    console.log('check radius issue')
    let isFetchedGeoCorderObj = await this.fetchGeocoderObject();
    if (!isFetchedGeoCorderObj) {
     // Toast.show("Unbale to fetcth geo locationinfo", Toast.LONG);
      this.setState({ loading: false });
    }

    let params = {
      team_member_empid: userId.user_id,
      groupid: this.checkInDataValue.groupid,
      check_out: moment(new Date()).utc(true).format("DD/MM/YYYY hh:mm a"),
      is_inrange: checkIsInRadius ? checkIsInRadius : false,
      modifiedby: userId.full_name,
      TimesheetCurrentLocationViewModel: {
        formatted_address: this.currentLocationObj.formatted_address,
        lat: this.cordinateObj.latitude,
        lang: this.cordinateObj.longitude,
        street_number: this.currentLocationObj.street_number,
        route: this.currentLocationObj.route,
        locality: this.currentLocationObj.locality,
        administrative_area_level_2: this.currentLocationObj
          .administrative_area_level_2,
        administrative_area_level_1: this.currentLocationObj
          .administrative_area_level_1,
        postal_code: this.currentLocationObj.postal_code,
        country: this.currentLocationObj.country,
      },
    };
    await storeData(LocalDBItems.checkOutLocationInfo, this.currentLocationObj);
    const requestObj = {
      endpoint: BaseUrl.API_BASE_URL + Endpoint.TIMESHEET_CHECKOUT,
      type: "post",
      params: params,
    };
    const apiResponseData = await apiService(requestObj);
    setTimeout(() => {
      this.setState({
        loading: false,
      });
      if (apiResponseData) {
        if (isEndOfWork) {
          this.isWorkEnded = true;
          this.isCheckinForLocation = false;
          storeData(LocalDBItems.isEmployeeLocationTrack, false);
          this.locationFetcher.removeLocationUpdate();
        } else {
          this.startTracking(); //for check out
        }
        clearInterval(this.timerCheckIn);
        clearInterval(this.timerBreakIn);
        this.timerStopCounter = 0;
        this.timerStopForBreakCounter = 0;
        this.setState({
          breakInData: null,
          checkInData: null,
          isStarted: false,
          isBreak: false,
          stopWatchCounter: "00:00",
          stopWatchCounterBreakIn: "00:00",
          loading: false,
          progressBarPercentage: 0,
          showAlertPopup: false,
          isCheckOutPopup: false,
        });
        const full_name = `${userId.full_name} checked out successfully`;
        Toast.show(full_name, Toast.LONG);
        const checkinInfo = { isOfficeChecin: false, isProjectCheckin: false };
        storeData(LocalDBItems.checkInInfo, checkinInfo);
      }
    }, 1000);
  };

  locationTrackingNewApi = async () => {
    let checkindata = await this.getCheckinDict()
    console.log('----------called locatuon')
    await this.trackRef.locationTrackingNewApi(checkindata, this.isTripEnd)
    /*
    let locationArray = this.locationInfoArray;
    if (locationArray != undefined) {
      let groupUUID = await this.getRandomUUID();

      // let groupUUID =
      let id = await UUIDGenerator.getRandomUUID();
      let checkoutLocationInfo = await getData(
        LocalDBItems.checkOutLocationInfo
      );
      const userId = await getData(LocalDBItems.employeeDetails);
      let isTracking = await getData(LocalDBItems.isLocationTrackingNeeded);
      let newLocationArray = await getData(LocalDBItems.locationArray);
      let prevoiusLocation = {};
      if (newLocationArray.length > 0) {
        prevoiusLocation = newLocationArray[0];
      } else {
        return;
      }
      let lastLocation = {};
      let lastIndex = newLocationArray.length - 1;
      if (lastIndex < newLocationArray.length) {
        lastLocation = newLocationArray[lastIndex];
      }
      let distance = this.calcDistance(prevoiusLocation, lastLocation);

      let date = new Date();
      const newLocationArrayMaped = locationArray.map((locationItem) => {
        return {
          groupid: groupUUID,
          lat: locationItem.latitude,
          lang: locationItem.longitude,
          created_date: date,
        };
      });
      const employeeDetails = await getData(LocalDBItems.employeeDetails);

      let checkInDict = await this.getCheckinDict();
      let dict = {
        id: id,
        empid: employeeDetails.id,
        groupid: groupUUID,
        distance: distance,
        checkout_formatted_address: checkoutLocationInfo.formatted_address,
        // "checkout_geo_address": this.cordinateObj.latitude,
        checkout_lat: checkoutLocationInfo.latitude,
        checkout_lang: checkoutLocationInfo.longitude,
        checkout_street_number: checkoutLocationInfo.street_number,
        checkout_route: checkoutLocationInfo.route,
        checkout_locality: checkoutLocationInfo.locality,
        checkout_administrative_area_level_2:
          checkoutLocationInfo.administrative_area_level_2,
        checkout_administrative_area_level_1:
          checkoutLocationInfo.administrative_area_level_1,
        checkin_formatted_address: "",
        travelClaimTrack: newLocationArrayMaped,
        created_date: date,
        createdby: "",
        is_trip_end: this.isTripEnd,
        ...checkInDict,
      };
      const requestObj = {
        endpoint: BaseUrl.API_BASE_URL + Endpoint.TIMESHEET_TRAVEL_CLAIM,
        type: "post",
        params: dict,
      };
      const apiResponseData = await apiService(requestObj);
      if (apiResponseData.status == "200") {
        this.previousTimeStamp = new Date();
        this.locationInfoArray = [];
      }
    } else {
    }
    */
  };
  getCheckinDict = async () => {
    let isTracking = await getData(LocalDBItems.isLocationTrackingNeeded);
    const checkInOutDetails = await getData(LocalDBItems.CHECK_IN_OUT_DETAILS);
    let dict = {};
    if (isTracking) {
      dict = {
        checkin_lat: 0.0,
        checkin_lang: 0.0,
        checkin_street_number: "",
        checkin_route: "",
        checkin_locality: "",
        checkin_administrative_area_level_2: "",
        checkin_administrative_area_level_1: "",
        checkin_project: "",
        checkin_jobType: "",
      };
    } else {
      console.log('-----450')
      //let isFetchedGeoCorderObj = await this.fetchGeocoderObject();
      // if (!isFetchedGeoCorderObj) {
      //  // Toast.show("Unbale to fetcth geo locationinfo", Toast.LONG);
      //   this.setState({ loading: false });
      // }
      dict = {
        checkin_formatted_address: this.currentLocationObj.formatted_address,
        // "checkout_geo_address": this.cordinateObj.latitude,
        checkin_lat: this.cordinateObj.latitude,
        checkin_lang: this.cordinateObj.longitude,
        checkin_street_number: this.currentLocationObj.street_number,
        checkin_route: this.currentLocationObj.route,
        checkin_locality: this.currentLocationObj.locality,
        checkin_administrative_area_level_2: this.currentLocationObj
          .administrative_area_level_2,
        checkin_administrative_area_level_1: this.currentLocationObj
          .administrative_area_level_1,
        checkin_project: checkInOutDetails.checkin_out_project,
        checkin_jobType: checkInOutDetails.checkin_out_jobType,
      };
    }
    return dict;
  };
  calcDistance = (newLatLng, prevLatLng) => {
    let distance = haversine(prevLatLng, newLatLng) || 0;
    // const { prevLatLng } = this.state;
    return distance;
  };
  getRandomUUID = async () => {
    let udid = await getData(LocalDBItems.groupUUID);
    if (udid == "" || udid == null) {
      udid = await UUIDGenerator.getRandomUUID();
      await storeData(LocalDBItems.groupUUID, udid);
    }
    return udid;
  };
  postBreakOut = async () => {
    let isFetchedGeoCorderObj = await this.fetchGeocoderObject();

    if (!isFetchedGeoCorderObj) {
      //Toast.show("Unbale to fetcth geo locationinfo", Toast.LONG);
      this.setState({ loading: false });
    }
    this.setState({ loading: true });
    const userId = await getData(LocalDBItems.employeeDetails);
    let checkIsInRadius = await this.locationFetcher.isLocationInRadius();
    let params = {
      team_member_empid: this.checkInDataValue.empid,
      groupid: this.checkInDataValue.groupid,
      check_out: moment(new Date()).utc(true).format("DD/MM/YYYY hh:mm a"),
      is_inrange: checkIsInRadius ? checkIsInRadius : false,
      modifiedby: userId.full_name,
      TimesheetCurrentLocationViewModel: {
        formatted_address: this.currentLocationObj.formatted_address,
        lat: this.cordinateObj.latitude,
        lang: this.cordinateObj.longitude,
        street_number: this.currentLocationObj.street_number,
        route: this.currentLocationObj.route,
        locality: this.currentLocationObj.locality,
        administrative_area_level_2: this.currentLocationObj
          .administrative_area_level_2,
        administrative_area_level_1: this.currentLocationObj
          .administrative_area_level_1,
        postal_code: this.currentLocationObj.postal_code,
        country: this.currentLocationObj.country,
      },
    };
    const requestObj = {
      endpoint: BaseUrl.API_BASE_URL + Endpoint.TIMESHEET_BREAKOUT,
      type: "post",
      params: params,
    };
    const apiResponseData = await apiService(requestObj);
    setTimeout(async () => {
      this.setState({
        loading: false,
      });
      if (apiResponseData.status === "200") {
        clearInterval(this.timerBreakIn);
        this.timerStopForBreakCounter = 0;
        await this.lastCheckinByEmpID(false);
        Toast.show(apiResponseData.desc, Toast.LONG);
        this.setState({
          isBreak: false,
          isStarted: true,
          breakInData: null,
          stopWatchCounterBreakIn: "00:00",
        });
      }
    }, 800);
  };
  fetchGeocoderObject = async () => {
    let locationObj = await getData(LocalDBItems.location);
    if (locationObj) {
      console.log("locationObj.latitude",locationObj.latitude);
      console.log("locationObj.latitude",locationObj.longitude);
      let locationName = await this.geoCoder.getPlaceFromCordinate(
        locationObj.latitude,
        locationObj.longitude
      );
      
      this.currentLocationObj = locationName;
      if (this.currentLocationObj) {
        return true;
      }
      return false;
    }
    return false;
  };
  /**
   * This method is to post break in
   */
  postBreakIn = async () => {
    this.setState({ loading: true });
    const userId = await getData(LocalDBItems.employeeDetails);
    let checkIsInRadius = await this.locationFetcher.isLocationInRadius();
    let isFetchedGeoCorderObj = await this.fetchGeocoderObject();
    if (!isFetchedGeoCorderObj) {
      //Toast.show("Unbale to fetcth geo locationinfo", Toast.LONG);
      this.setState({ loading: false });
    }
    let params = {
      team_member_empid: this.checkInDataValue.empid,
      groupid: this.checkInDataValue.groupid,
      check_out: moment(new Date()).utc(true).format("DD/MM/YYYY hh:mm a"),
      is_inrange: checkIsInRadius,
      modifiedby: userId.full_name,
      TimesheetCurrentLocationViewModel: {
        formatted_address: this.currentLocationObj.formatted_address,
        lat: this.cordinateObj.latitude,
        lang: this.cordinateObj.longitude,
        street_number: this.currentLocationObj.street_number,
        route: this.currentLocationObj.route,
        locality: this.currentLocationObj.locality,
        administrative_area_level_2: this.currentLocationObj
          .administrative_area_level_2,
        administrative_area_level_1: this.currentLocationObj
          .administrative_area_level_1,
        postal_code: this.currentLocationObj.postal_code,
        country: this.currentLocationObj.country,
      },
    };
    const requestObj = {
      endpoint: BaseUrl.API_BASE_URL + Endpoint.TIMESHEET_BREAKIN,
      type: "post",
      params: params,
    };
    const apiResponseData = await apiService(requestObj);
    setTimeout(async () => {
      this.setState({
        loading: false,
      });
      if (apiResponseData.status === "200") {
        clearInterval(this.timerCheckIn);
        await this.findTimeSheetBreakInBreakOut(false);
        this.setState({ isStarted: false });
        Toast.show(apiResponseData.desc, Toast.LONG);
      }
    }, 800);
  };
  findTimeSheetBreakInBreakOut = async (loader) => {
    this.setState({ loading: loader });
    const userId = await getData(LocalDBItems.employeeDetails);
    let params = {
      grpID: this.checkInDataValue.groupid,
      empID:
        this.checkInDataValue.empid.length > 0
          ? this.checkInDataValue.empid[0]
          : null,
    };
    const requestObj = {
      endpoint: BaseUrl.API_BASE_URL + Endpoint.FIND_BREAKIN_BREAKOUT,
      type: "post",
      params: params,
    };
    const apiResponseData = await apiService(requestObj);
    setTimeout(() => {
      this.setState({
        loading: false,
      });
      if (apiResponseData.length > 0) {
        const difference = moment.duration(
          moment(this.state.currentDate).diff(
            moment(apiResponseData[0].break_in)
          )
        );
        //difference of the expiry date-time given and current date-time
        var hours = parseInt(difference.asHours());
        var minutes = parseInt(difference.minutes());
        var seconds = parseInt(difference.seconds());
        var inSeconds = hours * 60 * 60 + minutes * 60 + seconds;
        if (inSeconds > 0) {
          this.timerStopForBreakCounter = inSeconds;
        } else {
          this.timerStopForBreakCounter = 0;
        }
        this.setState({
          breakInData: apiResponseData[0],
          loading: false,
          isBreak: true,
        });
        this.setBreakInBreakOutTimer();
      } else {
        this.setCheckInCheckOutTimer();
      }
    }, 500);
  };
  lastCheckinByEmpID = async (loader) => {
    this.setState({ loading: loader });
    const userId = await getData(LocalDBItems.employeeDetails);
    let params = { id: userId.id };
    const requestObj = {
      endpoint: BaseUrl.API_BASE_URL + Endpoint.LAST_CHECKINBY_EMPID,
      type: "post",
      params: params,
    };
    const apiResponseData = await apiService(requestObj);
    setTimeout(() => {
      this.setState({
        loading: false,
      });
      if (apiResponseData) {
        if (apiResponseData.length > 0) {
          const date = moment(apiResponseData[0].check_in).format(
            "MM/DD/YYYY hh:mm:ss A"
          );
          this.isCheckinForLocation = true;
          const dateToStore = moment(apiResponseData[0].check_in).toDate();
          storeData(LocalDBItems.checkInDate, dateToStore);
          const difference = moment.duration(
            moment(this.state.currentDate).diff(
              moment(apiResponseData[0].check_in)
            )
          );
          //difference of the expiry date-time given and current date-time
          var hours = parseInt(difference.asHours());
          var minutes = parseInt(difference.minutes());
          var seconds = parseInt(difference.seconds());
          var inSeconds = hours * 60 * 60 + minutes * 60 + seconds;
          var progressPercentage = (inSeconds / 39600) * 100; // calculate in 11 hours
          if (inSeconds > 0) {
            this.timerStopCounter = inSeconds;
          } else {
            this.timerStopCounter = 0;
          }
          var checkInData = {};
          var empid = [];
          if (apiResponseData.length > 1) {
            this.isCheckinAdmin = false;
            apiResponseData.forEach((item) => {
              if (userId.id === item.empid) {
                this.isCheckinAdmin = item.is_checkin_admin;
              }
              empid.push(item.empid);
            });
            const checkInData = {
              groupid:
                apiResponseData.length > 0 ? apiResponseData[0].groupid : null,
              empid: empid,
            };
            this.checkInDataValue = checkInData;
          } else {
            this.isCheckinAdmin = true;
            const checkInData = {
              groupid:
                apiResponseData.length > 0 ? apiResponseData[0].groupid : null,
              empid:
                apiResponseData.length > 0 ? [apiResponseData[0].empid] : null,
            };
            this.checkInDataValue = checkInData;
          }
          let isGroupCheckin = false;
          // this.fetchGroupMembers(checkInData.groupid)
          let employeeid = empid;
          if (employeeid && employeeid.length > 1) {
            isGroupCheckin = true;
            this.fetchGroupMembers(this.checkInDataValue.groupid);
          }
          this.setState({
            isGroupCheckIn: isGroupCheckin,
            checkInData: apiResponseData[0],
            stopWatchCounter: this.getTimeFormat(this.timerStopCounter),
            loading: false,
            isStarted: true,
            progressBarPercentage: progressPercentage,
          });
          this.findTimeSheetBreakInBreakOut(loader);
        }
      }
    }, 1000);
  };
  fetchGroupMembers = async (groupId) => {
    let params = { id: groupId };
    const requestObj = {
      endpoint: BaseUrl.API_BASE_URL + Endpoint.GET_ALL_EMPLOYEES_VIA_GROUPID,
      type: "post",
      params: params,
    };
    const apiResponseData = await apiService(requestObj);
    if (apiResponseData) {
      const getTeamEmployeeName = apiResponseData.map((value) => {
        return { ...value, label: value.full_name, value: value.full_name };
      });
      this.state.getGroupMembersList = getTeamEmployeeName;
      this.state.groupMemberInfoArray = apiResponseData;
      this.setState({ getGroupMembersList: getTeamEmployeeName });
    }
  };
  //StopWatch Timer
  setTimerForStopWatch() {
    this.timerCheckIn = setInterval(() => {
      if (this.state.isStarted) {
        this.timerFunctionCheckInCheckOut();
      }
    }, 1000);
  }
  //StopWatch Timer
  setTimerForStopWatchBreakIn() {
    this.timerBreakIn = setInterval(() => {
      if (this.state.isBreak) {
        this.timerFunctionBreakInBreakOut();
      }
    }, 1000);
  }
  timerFunctionCheckInCheckOut() {
    let timerStopWatch = this.timerStopCounter;
    timerStopWatch++;
    let progressPercenatge = (timerStopWatch / 28800) * 100;
    if (this.state.isStarted && !this.state.isPaused) {
      this.timerStopCounter = timerStopWatch;
    }
    if (this.state.isPaused) {
      this.timerStopCounter = timerStopWatch - 1;
    }

    if (!this.state.isPaused) {
      this.setState({
        stopWatchCounter: this.getTimeFormat(timerStopWatch),
        progressBarPercentage: progressPercenatge,
      });
    }
  }
  setCheckInCheckOutTimer(date) {
    if (this.state.isStarted) {
      this.setTimerForStopWatch();
    }
    this.setState({ isStarted: true, stopWatchCounter: "0:00" });
  }
  setBreakInBreakOutTimer(date) {
    if (this.state.isBreak) {
      this.setTimerForStopWatchBreakIn();
    }
    this.setState({ isBreak: true, stopWatchCounterBreakIn: "0:00" });
  }
  timerFunctionBreakInBreakOut() {
    let timerStopWatch = this.timerStopForBreakCounter;
    timerStopWatch++;
    if (this.state.isBreak && !this.state.isPaused) {
      this.timerStopForBreakCounter = timerStopWatch;
    }
    if (this.state.isPaused) {
      this.timerStopForBreakCounter = timerStopWatch - 1;
    }

    if (!this.state.isPaused) {
      this.setState({
        stopWatchCounterBreakIn: this.getTimeFormat(timerStopWatch),
      });
    }
  }
  getTimeFormat(time) {
    // Hours, minutes and seconds
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = ~~time % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
      ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
  }

  getLocationForTracking = async (locationObj) => {
    // if (this.state.locationFetcherNeeded){
    this.cordinateObj.latitude = locationObj.latitude;
    this.cordinateObj.longitude = locationObj.longitude;
    console.log(this.cordinateObj);
    let isTracking = await getData(LocalDBItems.isLocationTrackingNeeded);
  };
  getLoctionObj = async (locationObj) => {
    const checkInDate = await getData(LocalDBItems.checkInDate);
    let currentDate = new Date();
  };

  navigateToAuthScreen = async () => {
    // Toast.showWithGravity('apiResponseData.desc', Toast.LONG, Toast.BOTTOM)
    await wipeData();
    if (this.locationFetcher != null) {
      this.locationFetcher.removeListners();
      this.locationFetcher.removeLocationUpdate();
      this.locationFetcher = null;
    }
    storeData(LocalDBItems.isUserAuthenticated, false);
    NavigationService.navigateAndReset("Auth", {});
  };
  renderCheckBreakButton() {
    const {
      loading,
      checkInData,
      breakInData,
      isPaused,
      isStarted,
    } = this.state;
    return (
      <>
        {checkInData != null && breakInData == null && (
          <>
            {!this.isCheckinAdmin ? (
              <TouchableOpacity
                style={{
                  width: "85%",
                  marginBottom: 30,
                  justifyContent: "center",
                  alignSelf: "center",
                }}
              >
                <LinearGradient
                  start={{ x: 0.5, y: 1.0 }}
                  end={{ x: 0.0, y: 0.25 }}
                  colors={["#fe717f", "#fa8576", "#f6976e"]}
                  style={[styles.checkInButton, { opacity: 0.5 }]}
                >
                  <Text style={styles.checkInText}>{"CheckOut"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{
                  width: "85%",
                  marginBottom: 30,
                  justifyContent: "center",
                  alignSelf: "center",
                }}
                onPress={() => this.showPopupAndCheckOut()}
              >
                <LinearGradient
                  start={{ x: 0.5, y: 1.0 }}
                  end={{ x: 0.0, y: 0.25 }}
                  colors={["#fe717f", "#fa8576", "#f6976e"]}
                  style={styles.checkInButton}
                >
                  <Text style={styles.checkInText}>{"CheckOut"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
        {checkInData === null && (
          <TouchableOpacity
            style={{
              width: "85%",
              marginBottom: 30,
              justifyContent: "center",
              alignSelf: "center",
            }}
            onPress={() => this.navigateToCheckInScreen()}
          >
            <LinearGradient
              start={{ x: 0.5, y: 1.0 }}
              end={{ x: 0.0, y: 0.25 }}
              colors={["#fe717f", "#fa8576", "#f6976e"]}
              style={styles.checkInButton}
            >
              <Text style={styles.checkInText}>{"CheckIn"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {breakInData != null && checkInData != null && (
          <TouchableOpacity
            style={styles.breakInButton}
            onPress={() => this.postBreakOut()}
          >
            <Text style={styles.breakInText}>{"Break Out"}</Text>
          </TouchableOpacity>
        )}
        {breakInData === null && checkInData != null && (
          <TouchableOpacity
            style={styles.breakInButton}
            onPress={() => this.postBreakIn()}
          >
            <Text style={styles.breakInText}>{"Break In"}</Text>
          </TouchableOpacity>
        )}
      </>
    );
  }
  navigateToViewRoleScreen() {
    NavigationService.navigate("ViewRoleListScreen");
  }
  isInRadius = async (isInRadius) => {
    let checkinInfo = await getData(LocalDBItems.checkInInfo);
    if (
      checkinInfo &&
      (checkinInfo.isOfficeChecin === true ||
        checkinInfo.isProjectCheckin === true)
    ) {
      if (this.state.checkInData && this.state.loading == false) {
        this.setState({
          isInRadiusModalShow: isInRadius == false ? true : false,
        });
      }
    }
  };
  modalCloseAction = () => {
    this.setState({ isInRadiusModalShow: false });
    this.postCheckout();
  };
  submitAction = () => {
    this.setState({ isInRadiusModalShow: false });
    this.postCheckout(true);
  };
  modalCloseAlertAction = () => {
    this.setState({ showAlertPopup: false, isCheckOutPopup: false });
  };
  modalforcecheckoutaction =() => {
    this.setState({isForceCheckoutPopUp:false})
    this.getdata() ;
     
  }
  modalCheckOut = () => {
    this.postCheckout();
  };

  modalEndOfWork = async () => {
    await this.resetTracking();
    this.postCheckout(true);
  };

  modalLogout = () => {
    Geolocation.stopObserving();
    this.setState({ showAlertPopup: false, isCheckOutPopup: false }, () => {
      this.navigateToAuthScreen();
    });
  };
  resetTracking = async () => {
    await storeData(LocalDBItems.isLocationTrackingNeeded, false);
    await storeData(LocalDBItems.locationArray, []);
    await storeData(LocalDBItems.groupUUID, "");
    await storeData(LocalDBItems.locationArrayForTracing, []);
    this.setState({ showLiveTrackingButton: false });
  };
  startTracking = async () => {
    storeData(LocalDBItems.isLocationTrackingNeeded, true);
    storeData(LocalDBItems.locationArray, []);
    await storeData(LocalDBItems.locationArrayForTracing, []);
    this.setState({ showLiveTrackingButton: true });
  };

  showLogoutPopup = () => {
    const {showLiveTrackingButton } = this.state;
    if (showLiveTrackingButton) {
      Alert.alert('Live trip', 'If you logout the live trip data will be lost. Are you sure you want to continue?.', [
        {
          text: "OK",
          onPress: () => {
            this.setState({ showAlertPopup: true, isCheckOutPopup: false });
          },
          style: 'default',
        },
        {
          text: 'CANCEL',
          style: 'cancel',
        },
      ])
    } else {
      this.setState({ showAlertPopup: true, isCheckOutPopup: false });
    }
  };

  continousFetchRequired = async () => {
    let isLocationFetcherRequired = await getData(
      LocalDBItems.isLocationFetcherRequired
    );
    let isEmployeeLocationTrack = await getData(
      LocalDBItems.isEmployeeLocationTrack
    );
    if (isLocationFetcherRequired) {
      return isEmployeeLocationTrack;
    } else {
      return false;
    }
  };
  renderAdminPrivilage() {
    if (this.employeeDetails.is_superadmin || this.employeeDetails.is_admin) {
      return (
        <>
          <TouchableOpacity
            style={{
              position: "absolute",
              justifyContent: "flex-start",
              alignItems: "flex-end",
              left: 20,
              bottom: 20,
            }}
            onPress={() => this.navigateToViewRoleScreen()}
          >
            <Icon name="home" size={25} color="white" />
          </TouchableOpacity>
        </>
      );
    }
  }
  navigateToLiveTracking = () => {
    this.setState({ showTrackingModal: true });
  };
  openUrlToAddActivity = (url) => {
    Linking.openURL(url);
    // Linking.canOpenURL(url).then((supported) => {
    //   console.log("Sup",supported);
    //   if (supported) {
    //     Linking.openURL(url);
    //   } else {
    //   }
    // });
  };
  navigateToAddActivity = async () => {
    const tokenData = await getData(LocalDBItems.tokenData);
    const userData = await getData(LocalDBItems.userDetails);
    const url = `https://enforcesolutions.com/login-callback?token=${tokenData}&username=${userData.userName}`;
    this.openUrlToAddActivity(url);
  };
  onSelectGroupMember = (value, index) => {
    this.state.isDisabled = false;
    this.setState({ isDisabled: false });
    this.state.groupMemeber = this.state.groupMemberInfoArray[index];
  };
  assignTaskToMemeber = async () => {
    this.setState({ loading: true });
    const employeDetails = await getData(LocalDBItems.employeeDetails);

    let isFetchedGeoCorderObj = await this.fetchGeocoderObject();
    if (!isFetchedGeoCorderObj) {
     // Toast.show("Unbale to fetcth geo locationinfo", Toast.LONG);
      this.setState({ loading: false });
    }

    let params = {
      current_checkin_empid: employeDetails.id,
      handover_checkin_empid: this.state.groupMemeber.id,
      groupid: this.checkInDataValue.groupid,
      check_out: "",
      modifiedby: employeDetails.full_name,
      is_inrange: false,
      TimesheetCurrentLocationViewModel: {
        formatted_address: this.currentLocationObj.formatted_address,
        lat: this.cordinateObj.latitude,
        lang: this.cordinateObj.longitude,
        street_number: this.currentLocationObj.street_number,
        route: this.currentLocationObj.route,
        locality: this.currentLocationObj.locality,
        administrative_area_level_2: this.currentLocationObj
          .administrative_area_level_2,
        administrative_area_level_1: this.currentLocationObj
          .administrative_area_level_1,
        postal_code: this.currentLocationObj.postal_code,
        country: this.currentLocationObj.country,
      },
    };
    const requestObj = {
      endpoint: BaseUrl.API_BASE_URL + Endpoint.HAND_OVER_CHECKOUT,
      type: "post",
      params: params,
    };
    const apiResponseData = await apiService(requestObj);
    if (apiResponseData) {
      this.checkOutOnceTeamMemberAssginedOutOfRadius();
    }
    this.setState({ isInRadiusModalShow: false, loading: false });
  };
  /**
   *
   */
  modalCloseRadioDropDown = () => {
    this.setState({ isInRadiusModalShow: false });
  };

  hideLiveTracking = () => {
    this.setState({ showTrackingModal: false });
  };

  render() {
    const {
      loading,
      checkInData,
      breakInData,
      isPaused,
      isStarted,
    } = this.state;
    return (
      <View style={([Helpers.fillCol], styles.container)}>
        <LocationFetcher
          ref={(ref) => {
            this.locationFetcher = ref;
          }}
          getLocation={(location) => this.getLoctionObj(location)}
          isInRadiusOrNot={(isInRadius) => this.isInRadius(isInRadius)}
          isContiousSavingRequired={true}
          isInitialLoad={true}
          getLocationForTracking={(location) =>
            this.getLocationForTracking(location)
          }
        />
        <Loader loading={loading} />
        <LinearGradient
          start={{ x: 0.5, y: 1.0 }}
          end={{ x: 0.0, y: 0.25 }}
          colors={["#f6976e", "#fe717f", "#fa8576"]}
          style={styles.navigationLinearGradient}
        >
          <Text style={styles.titleText}>Time Log</Text>
          {this.renderAdminPrivilage()}
          <TouchableOpacity
            style={{
              position: "absolute",
              justifyContent: "flex-end",
              alignItems: "flex-end",
              right: 20,
              bottom: 20,
            }}
            onPress={() => this.showLogoutPopup()}
          >
            <Icon name="logout" size={25} color="white" />
          </TouchableOpacity>
        </LinearGradient>
        <View
          style={{
            padding: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              paddingLeft: 10,
              fontWeight: "bold",
              fontSize: 24,
              color: "#aab3be",
            }}
          >
            {this.employeeDetails.full_name}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            marginTop: 10,
            backgroundColor: "#f6f8fa",
          }}
        >
          <AnimatedCircularProgress
            size={320}
            width={25}
            backgroundWidth={25}
            fill={this.state.progressBarPercentage}
            tintColor="#fe717f"
            tintColorSecondary="#fe717f"
            backgroundColor="#e8ecef"
            arcSweepAngle={240}
            rotation={240}
            lineCap="round"
          >
            {(fill) => (
              <View style={{ flex: 1, marginTop: 60, alignItems: "center" }}>
                <Text style={{ fontSize: 16, color: "#aab3be" }}>
                  Working Time
                </Text>
                <Text style={{ fontSize: 60, marginTop: 5 }}>
                  {this.state.stopWatchCounter}
                </Text>
                <Text style={{ fontSize: 14, color: "#aab3be" }}>
                  Break Time
                </Text>
                <Text style={{ fontSize: 12, marginTop: 10 }}>
                  {this.state.stopWatchCounterBreakIn}
                </Text>
              </View>
            )}
          </AnimatedCircularProgress>
          <View style={{ width: "100%", height: 60 }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                height: 60,
                backgroundColor: "#e8ecef",
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => this.navigateToAddActivity()}
            >
              <Icons name="post-add" size={25} color="#fe717f" />
              <Text
                style={{
                  fontSize: 18,
                  color: "#fe717f",
                  fontWeight: "bold",
                  paddingLeft: 5,
                }}
              >
                Add Activity
              </Text>
            </TouchableOpacity>
          </View>
          {this.state.showLiveTrackingButton && (
            <View style={{ width: "100%", height: 60, marginTop: 5 }}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  height: 60,
                  backgroundColor: "#e8ecef",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => this.navigateToLiveTracking()}
              >
                <IconImage name="location-arrow" size={25} color="#fe717f" />
                <Text
                  style={{
                    fontSize: 18,
                    color: "#fe717f",
                    fontWeight: "bold",
                    paddingLeft: 5,
                  }}
                >
                  View Trip
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {this.renderCheckBreakButton()}
        {this.state.isGroupCheckIn === true ? (
          <CustomPopUp
            modalVisible={this.state.isInRadiusModalShow}
            modalCloseAction={this.modalCloseRadioDropDown}
            isVerifcationPopUp={false}
            modalReverifyAction={this.assignTaskToMemeber}
            items={this.state.getGroupMembersList}
            dropDownSelection={this.onSelectGroupMember}
            isDisabled={this.state.isDisabled}
          />
        ) : (
          <CustomModal
            modalVisible={this.state.isInRadiusModalShow}
            modalCloseAction={this.modalCloseAction}
            isVerifcationPopUp={false}
            submitAction={this.submitAction}
          />
        )}
        <AlertPopup
          modalVisible={this.state.showAlertPopup}
          modalCloseAlertAction={this.modalCloseAlertAction}
          modalCheckOutAction={this.modalCheckOut}
          modalEndOfWorkAction={this.modalEndOfWork}
          modalLogoutAction={this.modalLogout}
          isCheckOutPopup={this.state.isCheckOutPopup}
        />
        <ErrorAlertPopup
          modalVisible={this.state.isForceCheckoutPopUp}
          modalCloseAlertAction={this.modalCloseAlertAction}
          modalCheckOutAction={this.modalCheckOut}
          modalEndOfWorkAction={this.modalEndOfWork}
          modalLogoutAction={this.modalforcecheckoutaction}
          isCheckOutPopup={this.state.isForceCheckoutPopUp}
        />
        {this.state.showLiveTrackingButton &&
        <ViewLiveTrackingScreen
           ref={(trackingObj) => this.trackRef = trackingObj} 
          showTrackingModal={this.state.showTrackingModal}
          hideLiveTracking={this.hideLiveTracking}
          checkinDict = {this.getCheckinDict()}
          parentRef = {this.parentRef}
        ></ViewLiveTrackingScreen>
  }
      </View>
    );
  }
}
