import './howitworks.css';

function Howitworks() {
  const steps = [
    {
      number: '1',
      title: 'Create Account',
      description: 'Sign up in seconds with just your name, email and phone number.',
    },
    {
      number: '2',
      title: 'Fill in Search Details',
      description: 'Tell us the service you need, your location and a short description.',
    },
    {
      number: '3',
      title: 'Choose a Service',
      description: 'Browse verified providers near you and pick the one that fits your needs.',
    },
    {
      number: '4',
      title: 'Send a Message',
      description: 'Reach out directly to the provider with your request and details.',
    },
    {
      number: '5',
      title: 'Receive Contact Details',
      description: 'Get their phone number and email, then make calls to check availability.',
    },
  ];

  return (
    <section className="hiw-section">
      <div className="hiw-header">
        <h2 className="hiw-title">How Youpata Works</h2>
        <p className="hiw-subtitle">
          Connect with trusted pros, in just a few steps
        </p>
      </div>

      <div className="hiw-steps">
        {steps.map((step) => (
          <div className="hiw-step" key={step.number}>
            <span className="hiw-step-number">{step.number}</span>
            <div className="hiw-step-body">
              <h3 className="hiw-step-title">{step.title}</h3>
              <p className="hiw-step-desc">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Howitworks;