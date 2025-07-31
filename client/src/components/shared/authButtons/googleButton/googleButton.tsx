import { GoogleLogin } from '@react-oauth/google';

interface Props {
    authHandler: (userData: any) => void
}


export const RegistrationGoogleButton = ({ authHandler }: Props) => {

    return (
        <>
            <GoogleLogin theme="filled_blue" width={'min-content'} useOneTap={false} text="signin"
                onSuccess={credentialResponse => {
                    authHandler(credentialResponse)
                }}
                onError={() => {
                    console.log('Login Failed')
                }}
            />
        </>
    );
};