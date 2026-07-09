
const IST_OFFSET_SECONDS = 19800;

const safeParseFloat = (value, fallback = 0) => {
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const transformApiResponse = (data) => {
  if (data && data.data && Array.isArray(data.data)) {
      return data.data
        .map((d) => {
          let time;
          if (typeof d.timestamp === 'number') {
            time = d.timestamp + IST_OFFSET_SECONDS;
          } else if (d.date || d.datetime) {
            time = new Date(d.date || d.datetime || 0).getTime() / 1000 + IST_OFFSET_SECONDS;
          } else {
            time = 0;
          }

          return {
            time,
            open: safeParseFloat(d.open),
            high: safeParseFloat(d.high),
            low: safeParseFloat(d.low),
            close: safeParseFloat(d.close),
            volume: safeParseFloat(d.volume, 0),
          };
        })
        .filter(
          (candle) =>
            candle &&
            candle.time > 0 &&
            [candle.open, candle.high, candle.low, candle.close].every((value) =>
              Number.isFinite(value)
            )
        );
  }
  return [];
};

const apiResponse = {"data":[{"close":1437.9,"high":1473.3,"low":1427.5,"oi":0,"open":1463.0,"timestamp":1778025600,"volume":14221786},{"close":1436.5,"high":1442.1,"low":1430.3,"oi":0,"open":1438.8,"timestamp":1778112000,"volume":950752}],"status":"success"};

const result = transformApiResponse(apiResponse);
console.log(JSON.stringify(result, null, 2));
