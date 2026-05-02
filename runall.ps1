npx concurrently -n auth,product,order,gateway `
"cd AuthService && dotnet run" `
"cd ProductService && dotnet run" `
"cd OrderService && dotnet run" `
"cd ApiGateway && dotnet run"