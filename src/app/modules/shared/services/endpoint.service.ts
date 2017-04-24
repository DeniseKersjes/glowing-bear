import { Injectable } from '@angular/core';
import { Endpoint } from '../models/endpoint';

@Injectable()
export class EndpointService {

  private endpoint:Endpoint;

  constructor() {
    let parsedUrl = this.parseUrl(this.getCurrentUrl());

    // In development mode, we assume the rest API is at http://localhost:8080.
    // In production mode, we assume the rest API is at the same protocol+host.
    // We currently assume we are in development mode if the host is localhost.
    // Note that this is the default and it may be overwritten (restored) with
    // the value stored in localStorage.
    //TODO: make this configurable
    if (parsedUrl.hostname == 'localhost') {
      this.endpoint = new Endpoint('http://localhost:8080', 'v2');
    }
    else {
      let url = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
      this.endpoint = new Endpoint(url, 'v2');
    }

    // Check if there is authentication data in the hash fragment of the url
    let oauthGrantFragment:string = parsedUrl.hash;
    if (oauthGrantFragment.length > 1) {
      // Update the current endpoint with the received credentials
      this.initializeEndpointWithCredentials(this.endpoint, oauthGrantFragment);
      // Save the endpoint
      this.saveEndpoint();
    }
    else {
      this.restoreEndpoint();
    }
  }

  public getEndpoint() {
    return this.endpoint;
  }

  /**
   * Removes the currently held token and navigates to the authorization page
   * to get a new one.
   */
  invalidateToken() {
    this.endpoint.setAccessToken('');
    this.saveEndpoint();
    this.navigateToAuthorizationPage(this.endpoint);
  }

  /**
   * Return the current url
   * @returns {string}
   */
  private getCurrentUrl():string {
    return window.location.href;
  }

  /**
   * Navigates to the specified url
   * @param url
   */
  private navigateToUrl(url:string) {
    window.location.href = url;
  }

  /**
   * Parse the url into its elements
   * @param url
   * @returns {}
   */
  private parseUrl(url: string) {
    var match = url.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)#?(.*)$/);
    return match && {
      href: url,
      protocol: match[1],
      host: match[2],
      hostname: match[3],
      port: match[4],
      path: match[5],
      search: match[6],
      hash: match[7]
    };
  }

  /**
   * Navigate to the endpoint's authorization page.
   * @param endpoint
   */
  private navigateToAuthorizationPage(endpoint) {

    // Cut off any '/'
    var url = endpoint.getBaseUrl();
    if (url.substring(url.length - 1, url.length) === '/') {
      url = url.substring(0, url.length - 1);
    }

    // Construct the redirect url
    var parsedUrl = this.parseUrl(this.getCurrentUrl());
    let redirectUri =
      this.getRedirectURI(parsedUrl.protocol,
        parsedUrl.hostname,
        parsedUrl.port,
        parsedUrl.path);

    var authorizationUrl = `${url}/oauth/authorize?response_type=token&client_id=glowingbear-js&redirect_uri=${redirectUri}`;
    this.navigateToUrl(authorizationUrl);
  }

  /**
   * Return URI-encoded redirect URI that can be used as a parameter in a url
   * @param port {string}
   * @param host {string}
   * @param protocol {string}
   * @param path {string}
   * @returns {string}
   */
  private getRedirectURI(protocol, host, port, path) {
    if (['80', '443'].indexOf(port) >= 0) {
      port = '';
    } else {
      port = ':' + port;
    }
    let redirectUri = `${protocol}//${host}${port}`;
    return encodeURIComponent(redirectUri);
  }

  /**
   * Sets up a new restangular instance using the specified credentials.
   * @param endpoint
   * @param oauthGrantFragment
   */
  private initializeEndpointWithCredentials(endpoint, oauthGrantFragment) {
    var fragmentParams = this.getFragmentParameters(oauthGrantFragment);
    endpoint.setAccessToken(fragmentParams.access_token);
    var time = new Date();
    endpoint.expiresAt = time.setTime(time.getTime() + fragmentParams.expires_in * 1000);
  }

  /**
   * Returns the parsed fragment parameters as an object
   * @param fragment
   * @returns {*}
   */
  private getFragmentParameters(fragment:string) {
    return JSON.parse('{"' +
      decodeURI(
        fragment
          .replace(/&/g, "\",\"") // replace '&' with ','
          .replace(/=/g, "\":\"")) + '"}' // replace '=' with ':'
    );
  }

  /**
   * Saves the endpoint to local storage.
   */
  private saveEndpoint() {
    localStorage.setItem('endpoint', JSON.stringify(this.endpoint));
  }

  /**
   * Restores the endpoint from local storage, or navigates to the
   * authorization page is no data is found.
   */
  private restoreEndpoint() {
    let endpointJSON = localStorage.getItem('endpoint');
    if (endpointJSON) {
      Object.assign(this.endpoint, JSON.parse(endpointJSON));
    }
    else {
      this.navigateToAuthorizationPage(this.endpoint);
    }
  }

}