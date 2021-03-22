import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity, ImageBackground } from 'react-native';
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import firebase from 'firebase';
import firestore from 'firebase';

export default class CustomActions extends React.Component {
    constructor() {
        super();
    }

    pickImage = async () => {
        const { status } = await Permissions.askAsync(Permissions.MEDIA_LIBRARY);

        if (status === 'granted') {
            let result = await ImagePicker.launchImageLibraryAsync({
                // Matt's edit: syntax change for mediaTypes
                mediaTypes: ImagePicker.MediaTypeOptions.Images
            }).catch(error => console.error(error));

            if (!result.cancelled) {
                // Matt's edit: Here is where we need to upload the image to the server and send it in the app
            
                this.setState({
                    image: result
                });
                // Upload image to database
                const imageUrl = await this.uploadImageFetch(result.uri);
                // Send image in chat 
                this.props.onSend({ image: imageUrl });
            }
        }
    }

    takePhoto = async () => {
        const { status } = await Permissions.askAsync(Permissions.CAMERA, Permissions.MEDIA_LIBRARY);

        if (status === 'granted') {
            let result = await ImagePicker.launchCameraAsync({mediaTypes: ImagePicker.MediaTypeOptions.Images,}).catch(error => console.error(error));

            // Matt's edit: you need to call the uploadImageFetch when you take the photo so that the database is contacted
            // Uploads image to database and sends image in chat
            if (!result.cancelled) {
                const imageUrl = await this.uploadImageFetch(result.uri);
                this.props.onSend({ image: imageUrl });
            }
        }
    }

    getLocation = async () => {
        const { status } = await Permissions.askAsync(Permissions.LOCATION);

        if (status === 'granted') {
            let result = await Location.getCurrentPositionAsync({}).catch(error => console.log(error));
            // Matt's edit:
            // Here we derive both latitude and longitude properties of the location
            const latitude = JSON.stringify(result.coords.latitude);
            const longitude = JSON.stringify(result.coords.longitude);

            if (result) {
                this.setState({
                    location: result
                });
                // Matt's edit:
                // We need to call the message event handler to then send the location that we have grabbed from the user
                this.props.onSend({location: {
                    latitude,
                    longitude
                }})
            }
        }
    }

    uploadImageFetch = async (uri) => {
        const blob = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
                resolve(xhr.response);
            };
            xhr.onerror = function (e) {
                console.log('XHRonError', e);
                reject(new TypeError('Network request failed'));
            };
            xhr.responseType = 'blob';
            xhr.open('GET', uri, true);
            xhr.send(null);
        });

        const imageNameBefore = uri.split('/');
        const imageName = imageNameBefore[imageNameBefore.length - 1];

        const ref = firebase.storage().ref().child(`images/${imageName}`);
        const snapshot = await ref.put(blob);

        blob.close();

        return await snapshot.ref.getDownloadURL();
    }

    onActionPress = () => {
        const options = ['Choose From Library', 'Take Picture', 'Send Location', 'Cancel'];
        const cancelButtonIndex = options.length - 1;
        this.context.actionSheet().showActionSheetWithOptions(
            {
                options,
                cancelButtonIndex,
            },
            async (buttonIndex) => {
                switch (buttonIndex) {
                    case 0:
                        return this.pickImage();
                    case 1:
                        return this.takePhoto();
                    case 2:
                        return this.getLocation();
                    default:
                }
            },
        );
    };

    render() {
        return (
            <TouchableOpacity accessible={true} accessibilityLabel='More options' accessibilityHint='Let’s you choose to send an image or your geolocation.' style={[styles.container]} onPress={this.onActionPress}>
                <View style={[styles.wrapper, this.props.wrapperStyle]}>
                    <Text style={[styles.iconText, this.props.iconTextStyle]}>+</Text>
                </View>
            </TouchableOpacity>
        );
    }

}

const styles = StyleSheet.create({
    container: {
        width: 26,
        height: 26,
        marginLeft: 10,
        marginBottom: 10,
    },
    wrapper: {
        borderRadius: 13,
        borderColor: '#b2b2b2',
        borderWidth: 2,
        flex: 1,
    },
    iconText: {
        color: '#b2b2b2',
        fontWeight: 'bold',
        fontSize: 16,
        backgroundColor: 'transparent',
        textAlign: 'center',
    }
});


CustomActions.contextTypes = {
    actionSheet: PropTypes.func
};