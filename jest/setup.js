import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';


jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
Enzyme.configure({ adapter: new Adapter() });