import {
  MutableRef, useRef, useState,
} from 'preact/hooks';

const useStateWithRef = <T>(initialValue: T): [T, (val: T) => void, MutableRef<T>] => {
  const [state, setState] = useState<T>(initialValue);
  const ref = useRef<T>(initialValue);

  return [state, (val: T) => {
    ref.current = val;
    setState(val);
  }, ref];
};

export default useStateWithRef;
