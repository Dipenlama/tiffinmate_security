export default function RegisterForm() {
    
    return (
        <div className="mx-auto max-w-md p-4 border rounded">
            Register Header  
            <div>
                <label>Full Name</label>
                <input type="full name"/>
            </div>
            <div>
                <label>Email</label>
                <input type="emial"/>
            </div>
            <div>
                <label>Contact</label>
                <input type="contact"/>
            </div>
            <div>
                <label>Password</label>
                <input type="password"/>
            </div>
        </div>
    );
}