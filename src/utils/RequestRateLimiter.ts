export class RequestRateLimiter {
    private readonly _maxRequests;
    private readonly _interval;
    private fnQueue: Array<() => Promise<any>> = [];
    private queueScheduledToClear: boolean = false;

    constructor(maxRequests: number, interval: number) {
        this._maxRequests = maxRequests;
        this._interval = interval;
    }

    private executeLimitedNumberOfRequestsInQueue = () => {
        const queueLength = this.fnQueue.length;
        if (queueLength !== 0) {
            const promises: Array<Promise<any>> = [];
            for (let i = 0; i < Math.min(queueLength, this._maxRequests); i++) promises.push(this.fnQueue.shift()!());
            Promise.all(promises).then(() => setTimeout(this.executeLimitedNumberOfRequestsInQueue, this._interval));
        } else this.queueScheduledToClear = false;
    }

    returnRateLimitedPromise = <T>(fnToBeRateLimited: () => Promise<T>): Promise<T> => {
        if (!this.queueScheduledToClear) {
            this.queueScheduledToClear = true;
            setTimeout(this.executeLimitedNumberOfRequestsInQueue, 0);
        }

        return new Promise((resolve, reject) => this.fnQueue.push(() => fnToBeRateLimited().then(resolve).catch(reject)));
    }
}