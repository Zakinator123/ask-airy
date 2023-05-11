export class RequestRateLimiter {
    private readonly _maxRequests;
    private readonly _interval;
    private fnQueue: Array<() => Promise<any>> = [];
    private requestsBucket: number;
    private bucketScheduledToEmpty: boolean;

    constructor(maxRequests: number, interval: number) {
        this._maxRequests = maxRequests;
        this._interval = interval;
        this.requestsBucket = 0;
        this.bucketScheduledToEmpty = false;
    }

    private executeLimitedNumberOfRequestsInQueue = async () => {
        if (this.fnQueue.length !== 0 && !this.bucketScheduledToEmpty) {
            setTimeout(() => {
                this.requestsBucket = 0;
                this.bucketScheduledToEmpty = false;
                this.executeLimitedNumberOfRequestsInQueue();
            }, this._interval);
        }

        let concurrentRequestsInFlight = [];
        while (this.fnQueue.length !== 0) {
            if (this.requestsBucket + 1 > this._maxRequests) break;

            if (concurrentRequestsInFlight.length >= this._maxRequests) {
                await Promise.all(concurrentRequestsInFlight);
                concurrentRequestsInFlight = [];
            }

            this.requestsBucket += 1;
            concurrentRequestsInFlight.push(this.fnQueue.shift()!());
        }
    }

    returnRateLimitedPromise = <T>(fnToBeRateLimited: () => Promise<T>): Promise<T> => {
        if (this.fnQueue.length === 0) {
            setTimeout(this.executeLimitedNumberOfRequestsInQueue, 0);
        }

        return new Promise((resolve, reject) => this.fnQueue.push(() => fnToBeRateLimited().then(resolve).catch(reject)));
    }
}