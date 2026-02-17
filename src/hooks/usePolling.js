import { useState, useEffect } from 'react';

const usePolling = (callback, interval = 3000) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer;
    if (active) {
      timer = setInterval(callback, interval);
    }
    return () => clearInterval(timer);
  }, [active, callback, interval]);

  return { setActive };
};

export default usePolling;
