import { GiftedChat, Bubble, InputToolbar } from 'react-native-gifted-chat';
import React, { Component } from 'react';
import { View, Text, Platform, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import NetInfo from '@react-native-community/netinfo';
import MapView from 'react-native-maps';
import CustomActions from './CustomActions';

// Google Firebase
const firebase = require('firebase');
require('firebase/firestore');

export default class Chat extends React.Component {
    constructor() {
        super();
        this.state = {
            messages: [],
            user: {
                _id: '',
                name: '',
                avatar: ''
            },
            uid: 0,
            isConnected: false,
            image: null,
            // We can just instantiate a null location 
            location: null,
        };

        const firebaseConfig = {
            apiKey: "AIzaSyD6fzAKTKcRRFox09hPp6PFFZfQeKlx2BE",
            authDomain: "chat-app-d6966.firebaseapp.com",
            projectId: "chat-app-d6966",
            storageBucket: "chat-app-d6966.appspot.com",
            messagingSenderId: "1008774765361",
            appId: "1:1008774765361:web:7aa06d72f8f64b0618ee10",
            measurementId: "G-WG69X0Y20Q"
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        this.referenceChatUser = null;
        this.referenceChatMessages = firebase.firestore().collection('messages');
    }

    async getMessages() {
        let messages = [];
        try {
            messages = await AsyncStorage.getItem('messages') || [];
            this.setState({
                messages: JSON.parse(messages)
            });
        } catch (error) {
            console.log(error.message);
        }
    };

    async saveMessages() {
        try {
            await AsyncStorage.setItem('messages', JSON.stringify(this.state.messages));
        } catch (error) {
            console.log(error.message);
        }
    };

    async deleteMessages() {
        try {
            await AsyncStorage.removeItem('messages');
            this.setState({
                messages: []
            })
        } catch (error) {
            console.log(error.message);
        }
    };

    componentDidMount() {

        let name = this.props.route.params.name;

        this.props.navigation.setOptions({ title: name });

        NetInfo.fetch().then(connection => {
            if (connection.isConnected) {
                console.log('online');
                this.authUnsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
                    if (!user) {
                        await firebase.auth().signInAnonymously();
                    }
                    this.setState({
                        uid: user.id,
                        isConnected: true,
                        user: {
                            _id: user.uid,
                            name: this.props.route.params.name,
                            avatar: 'https://placeimg.com/140/140/any'
                        },
                        messages: [],
                    });
                    this.referenceChatMessages = firebase.firestore().collection('messages');
                    this.unsubscribeChatUser = this.referenceChatMessages.orderBy('createdAt', 'desc').onSnapshot(this.onCollectionUpdate);
                });
            } else {
                console.log('offline');
                this.setState({
                    isConnected: false
                });
                this.getMessages();
            }
        });
    }

    componentWillUnmount() {
        this.authUnsubscribe();
        this.unsubscribeChatUser();
    }

    onCollectionUpdate = (querySnapshot) => {
        const messages = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            messages.push({
                _id: data._id,
                text: data.text,
                createdAt: data.createdAt.toDate(),
                user: {
                    _id: data.user._id,
                    name: data.user.name,
                    avatar: data.user.avatar,
                },
                image: data.image || "",
                location: data.location || null,
            });
        });
        this.setState({
            messages
        });
    };

    addMessage() {
        const message = this.state.messages[0];
        this.referenceChatMessages.add({
            _id: message._id,
            createdAt: message.createdAt,
            text: message.text || '',
            user: message.user,
            image: message.image || '',
            location: message.location || null,
        });
    }

    onSend(messages = []) {
        this.setState((previousState) => ({
            messages: GiftedChat.append(previousState.messages, messages),
        }),
            () => {
                this.addMessage();
                this.saveMessages();
            });
    }

    renderBubble(props) {
        return (
            <Bubble
                {...props}
                wrapperStyle={{
                    right: {
                        backgroundColor: '#000'
                    }
                }}
            />
        );
    }

    renderInputToolbar(props) {
        if (this.state.isConnected == false) {
        } else {
            return (
                <InputToolbar
                    {...props}
                />
            );
        }
    }

    renderCustomActions = (props) => {
        return <CustomActions {...props} />;
    }

    renderCustomView(props) {
        const { currentMessage } = props;
        if (currentMessage.location) {
            return (
                <MapView
                    style={{
                        width: 150,
                        height: 100,
                        borderRadius: 13,
                        margin: 3
                    }}
                    region={{
                        // Matt's edit: You need to convert to Number type to prevent evaluating an undefined type
                        latitude: Number(currentMessage.location.latitude),
                        longitude: Number(currentMessage.location.longitude),
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421
                    }}
                />
            );
        }
        return null;
    }

    render() {
        let color = this.props.route.params.color;

        return (
            <View style={{ flex: 1, backgroundColor: color }}>
                {/* Matt's edit: These two blocks of code are unneccessary
                
                */}
                {/* {this.state.image &&
                    <Image source={{ uri: this.state.image.uri }}
                        style={{ width: 200, height: 200 }} />}

                {this.state.location &&
                    <MapView
                        style={{ width: 300, height: 200 }}
                        region={{
                            // ERROR LOCATION DURING RUNTIME
                            latitude: this.state.location.coords.latitude,
                            longitude: this.state.location.coords.longitude,
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
                        }}
                    />} */}

                <GiftedChat
                    renderBubble={this.renderBubble.bind(this)}
                    renderInputToolbar={this.renderInputToolbar.bind(this)}
                    messages={this.state.messages}
                    onSend={messages => this.onSend(messages)}
                    user={this.state.user}
                    image={this.state.image}
                    renderActions={this.renderCustomActions}
                    renderCustomView={this.renderCustomView}
                />
                { Platform.OS === 'android' ? <KeyboardAvoidingView behavior="height" /> : null}
            </View >
        );
    }
}